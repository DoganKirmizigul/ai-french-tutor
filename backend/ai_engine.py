import json
import os
import re
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

# ── Model configuration ───────────────────────────────────────────────────────
_BASE_URL = os.getenv("AI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta/openai/")
_MODEL    = os.getenv("AI_MODEL",    "gemini-2.5-flash")
_API_KEY  = os.getenv("GEMINI_API_KEY", "")

def _client() -> OpenAI:
    if not _API_KEY:
        raise ValueError("GEMINI_API_KEY not found. Check your .env file.")
    return OpenAI(api_key=_API_KEY, base_url=_BASE_URL)

def _complete(messages: list, temperature: float = 0.7, json_mode: bool = False) -> str:
    client = _client()
    kwargs = {"model": _MODEL, "messages": messages, "temperature": temperature}
    if json_mode:
        kwargs["response_format"] = {"type": "json_object"}
    resp = client.chat.completions.create(**kwargs)
    return resp.choices[0].message.content or ""

def _parse_json(raw: str) -> dict | list:
    """Safely parse JSON from any string, including markdown code blocks."""
    raw = raw.strip()
    match = re.search(r"```(?:json)?\s*([\s\S]+?)\s*```", raw)
    if match:
        raw = match.group(1)
    return json.loads(raw)

# ── Placement test ────────────────────────────────────────────────────────────

def generate_placement_test() -> list:
    system = "You are a French language test expert. Return only valid JSON."
    prompt = """Generate 10 multiple-choice questions across 4 levels from A1 to B2.
2-3 questions per level. Cover grammar, vocabulary, and reading comprehension.

JSON format:
{
  "questions": [
    {
      "id": 1,
      "question": "Question text (with Turkish explanation where helpful)",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A",
      "level": "A1",
      "topic": "articles"
    }
  ]
}"""
    raw = _complete([{"role": "system", "content": system}, {"role": "user", "content": prompt}], json_mode=True)
    return _parse_json(raw).get("questions", [])

def evaluate_placement(questions: list, answers: list) -> dict:
    score_by_level: dict[str, list[int]] = {"A1": [0, 0], "A2": [0, 0], "B1": [0, 0], "B2": [0, 0]}
    for q, ans in zip(questions, answers):
        lvl = q.get("level", "A1")
        if lvl in score_by_level:
            score_by_level[lvl][1] += 1
            if ans and ans.strip()[0].upper() == q["answer"].strip()[0].upper():
                score_by_level[lvl][0] += 1

    level = "A1"
    for lvl in ["B2", "B1", "A2", "A1"]:
        s = score_by_level[lvl]
        if s[1] > 0 and s[0] / s[1] >= 0.6:
            level = lvl
            break

    return {"level": level, "scores": score_by_level}

# ── Exercise generation ───────────────────────────────────────────────────────

def generate_exercises(level: str, weak_topics: dict, error_log: str, count: int = 3) -> list:
    weak_str = ", ".join(
        f"{k} ({v} errors)" for k, v in sorted(weak_topics.items(), key=lambda x: -x[1])[:5]
    ) or "None identified yet"

    log_excerpt = error_log[-3000:] if len(error_log) > 3000 else error_log

    system = """You are a strict and experienced French teacher.
Generate personalized exercises focused on the student's WEAK AREAS.
- Always ask for nouns with their articles (le/la/un/une)
- Use a balanced mix of question types
- Return only valid JSON"""

    prompt = f"""Student level: {level}
Weak topics: {weak_str}
Recent error log (for reference):
{log_excerpt}

Generate {count} original exercise questions. Focus on weak topics.

JSON format:
{{
  "exercises": [
    {{
      "id": 1,
      "type": "fill_blank",
      "question": "Je ___ (aller) au marché hier.",
      "options": null,
      "hint": "Passé composé — aller uses être as auxiliary",
      "answer": "suis allé(e)",
      "topic": "passé composé",
      "level": "{level}"
    }}
  ]
}}

Types: fill_blank | translation | conjugation | multiple_choice
For multiple_choice, options: ["A) ...", "B) ...", "C) ...", "D) ..."]
For translation, question is in Turkish, answer is in French"""

    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True
    )
    return _parse_json(raw).get("exercises", [])

def check_answers(exercises: list, answers: list) -> dict:
    pairs = []
    for ex, ans in zip(exercises, answers):
        pairs.append(
            f"Question {ex['id']} [{ex['type']}]: {ex['question']}\n"
            f"  Expected answer: {ex['answer']}\n"
            f"  Student answer: {ans or '(empty)'}"
        )

    system = "You are a French teacher. Evaluate answers and explain in Turkish. Return only JSON."
    prompt = f"""Evaluate the following French exercise answers:

{chr(10).join(pairs)}

Important rules:
- Count minor accent errors (é→e, ç→c) as wrong but mention them gently
- Accept different correct formulations if the meaning is right
- For each error, give a short Turkish grammar explanation

JSON:
{{
  "results": [
    {{
      "id": 1,
      "correct": true,
      "user_answer": "...",
      "correct_answer": "...",
      "feedback": "Short Turkish explanation",
      "topic": "passé composé",
      "wrong_word": "..."
    }}
  ]
}}"""

    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True
    )
    return _parse_json(raw)

# ── Dictée ────────────────────────────────────────────────────────────────────

def generate_dictee_sentence(level: str) -> str:
    length = {"A1": "5-7", "A2": "8-12", "B1": "12-18", "B2": "16-25"}.get(level, "8-12")
    system = "You are a French teacher."
    prompt = f"""Generate a dictée sentence for level {level}.
- Length: approximately {length} words
- Write only the French sentence, nothing else
- Use a natural, everyday sentence"""
    return _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        temperature=0.95
    ).strip().strip('"')

def check_dictee(original: str, user_input: str) -> dict:
    system = "You are a French language expert. Return only JSON."
    prompt = f"""Dictée evaluation:
Original: "{original}"
Student wrote: "{user_input}"

Compare word by word:
{{
  "correct_words": 5,
  "wrong_words": 2,
  "errors": [
    {{"wrong": "alais", "correct": "allais", "hint": "Imparfait conjugation"}}
  ],
  "score": 75,
  "feedback": "General feedback in Turkish"
}}"""
    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True
    )
    return _parse_json(raw)

# ── Word of the day ───────────────────────────────────────────────────────────

def generate_word_of_day(level: str, known_words: list = None) -> dict:
    known_str = ", ".join((known_words or [])[:20])
    system = "You are a French teacher. Return only JSON."
    prompt = f"""Generate the word of the day for level {level}.
{"The student already knows these words, don't repeat them: " + known_str if known_str else ""}

JSON:
{{
  "word": "le voyage",
  "meaning": "trip, journey (Turkish: yolculuk)",
  "pronunciation": "vwa-yazh",
  "example": "J'aime faire des voyages en Europe.",
  "example_meaning": "I love traveling in Europe. (Turkish: Avrupa'da seyahat etmeyi severim.)",
  "tip": "voyage → voyager (to travel) — same root"
}}"""
    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True
    )
    return _parse_json(raw)

# ── Topic suggestion ──────────────────────────────────────────────────────────

def suggest_next_topic(level: str, weak_topics: dict) -> dict:
    system = "You are a French curriculum expert. Return only JSON."
    weak_str = ", ".join(weak_topics.keys()) if weak_topics else "none"
    prompt = (
        f"Student level: {level}. Weak topics: {weak_str}.\n"
        "Suggest the most important French topic this student should study next.\n"
        'JSON: {"topic": "...", "reason": "...", "tip": "..."}'
    )
    try:
        raw = _complete(
            [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
            json_mode=True, temperature=0.4
        )
        result = _parse_json(raw)
        if not isinstance(result, dict):
            return {"topic": str(result), "reason": "", "tip": ""}
        return result
    except Exception as e:
        return {"topic": "Unknown", "reason": str(e), "tip": ""}

# ── Word suggestion ───────────────────────────────────────────────────────────

def suggest_words(level: str, weak_topics: dict, known_words: list, mode: str = "progress", count: int = 10) -> list:
    """
    mode="progress" → words based on level and weak topics
    mode="frequency" → most common French words not yet known
    """
    known_str = ", ".join(known_words[:60]) if known_words else "none yet"
    weak_str  = ", ".join(weak_topics.keys()) if weak_topics else "none"

    if mode == "frequency":
        instruction = f"""Select {count} of the most common French words that the student doesn't know yet.
Already known: {known_str}
Level: {level} — pick frequency words appropriate for this level."""
    else:
        instruction = f"""Select {count} words the student should learn based on their level ({level}) and weak topics ({weak_str}).
Already known (don't repeat): {known_str}
Choose practical, everyday words that are genuinely useful."""

    system = "You are a French vocabulary expert. Return only JSON."
    prompt = f"""{instruction}

JSON:
{{
  "words": [
    {{
      "word": "le voyage",
      "meaning": "trip, journey (Turkish: yolculuk)",
      "example": "J'aime faire des voyages.",
      "topic": "daily life",
      "frequency_rank": 342
    }}
  ]
}}"""
    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True, temperature=0.5
    )
    return _parse_json(raw).get("words", [])

# ── Topic explanation ─────────────────────────────────────────────────────────

def explain_topic(topic_name: str, level: str) -> dict:
    system = "You are an expert French teacher. Explain in Turkish, give French examples. Return only JSON."
    prompt = f"""Explain the topic "{topic_name}" for level {level}.

JSON format (exactly this structure):
{{
  "title": "Topic title",
  "summary": "2-3 sentence overview (in Turkish)",
  "main_rule": "Core rule explanation (in Turkish, clear and simple)",
  "formula": "Structure formula if applicable, e.g. Sujet + avoir/être + Participe passé",
  "sub_rules": [
    {{"title": "Sub-rule 1", "explanation": "Explanation", "example_fr": "Example sentence", "example_tr": "Turkish translation"}},
    {{"title": "Sub-rule 2", "explanation": "Explanation", "example_fr": "Example sentence", "example_tr": "Turkish translation"}}
  ],
  "examples": [
    {{"fr": "French sentence", "tr": "Turkish meaning", "note": "Key point to highlight"}},
    {{"fr": "French sentence 2", "tr": "Turkish meaning 2", "note": ""}}
  ],
  "common_mistakes": [
    {{"wrong": "Wrong usage", "correct": "Correct usage", "explanation": "Why it's wrong"}}
  ],
  "tip": "Short memorable tip or mnemonic"
}}"""
    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True, temperature=0.4
    )
    return _parse_json(raw)

def generate_topic_quiz(topic_name: str, level: str, last_score: int = 100) -> list:
    """5-question quiz for a topic. Easier questions if last_score is low."""
    difficulty = "basic (very simple)" if last_score < 50 else ("intermediate" if last_score < 80 else "advanced")
    system = "You are a French teacher. Return only JSON."
    prompt = f"""Generate 5 {difficulty}-level questions about "{topic_name}" for level {level}.
Test only this topic, don't stray into other areas.

JSON:
{{
  "questions": [
    {{
      "id": 1,
      "question": "Question text",
      "type": "multiple_choice",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "answer": "A",
      "explanation": "Why this answer is correct (in Turkish, brief)"
    }}
  ]
}}

Types: multiple_choice | fill_blank | translation
For fill_blank and translation, options: null"""
    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True, temperature=0.6
    )
    return _parse_json(raw).get("questions", [])

def check_topic_quiz(questions: list, answers: list) -> dict:
    pairs = []
    for q, a in zip(questions, answers):
        pairs.append(
            f"Question {q['id']} [{q['type']}]: {q['question']}\n"
            f"  Expected: {q['answer']}\n"
            f"  Student: {a or '(empty)'}"
        )
    system = "You are a French teacher. Return only JSON."
    prompt = f"""Evaluate these quiz answers:

{chr(10).join(pairs)}

JSON:
{{
  "results": [
    {{
      "id": 1,
      "correct": true,
      "user_answer": "...",
      "correct_answer": "...",
      "feedback": "Short Turkish explanation"
    }}
  ],
  "summary": "Motivating Turkish performance summary (2-3 sentences)",
  "advice": "Next step recommendation"
}}"""
    raw = _complete(
        [{"role": "system", "content": system}, {"role": "user", "content": prompt}],
        json_mode=True
    )
    return _parse_json(raw)

# ── Chat ──────────────────────────────────────────────────────────────────────

def chat(messages: list) -> str:
    system = """You are a helpful, motivating, and experienced French teacher.
- You are teaching French to Turkish-speaking students
- Answer questions in Turkish but always include French examples
- Keep responses short, clear, and easy to understand
- Encourage the student and remind them that making mistakes is normal
- When explaining grammar, use concrete examples"""
    full = [{"role": "system", "content": system}] + messages
    return _complete(full, temperature=0.8)
