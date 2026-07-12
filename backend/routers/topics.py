from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import ai_engine as ai
import db

router = APIRouter()


def _topic_id(name: str) -> str:
    return "topic_" + name.lower().replace(" ", "_")[:40]


class ExplainReq(BaseModel):
    topic: str
    level: str


class QuizReq(BaseModel):
    topic: str
    level: str


class QuizCheckReq(BaseModel):
    topic: str
    questions: list
    answers: list


@router.post("/explain")
def explain(req: ExplainReq):
    try:
        explanation = ai.explain_topic(req.topic, req.level)
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
    return {"explanation": explanation, "stat": db.get_topic_stat(_topic_id(req.topic))}


@router.post("/quiz")
def quiz(req: QuizReq):
    stat = db.get_topic_stat(_topic_id(req.topic))
    last_score = stat["last_score"] if stat["attempt_count"] > 0 else 100
    try:
        questions = ai.generate_topic_quiz(req.topic, req.level, last_score)
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
    return {"questions": questions}


@router.post("/quiz/check")
def quiz_check(req: QuizCheckReq):
    try:
        result = ai.check_topic_quiz(req.questions, req.answers)
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")

    results = result.get("results", [])
    correct = sum(1 for r in results if r.get("correct"))
    total = len(results)
    score = db.update_topic_score(_topic_id(req.topic), req.topic, correct, total)

    # Below 75% → add to weak topics (mirrors Streamlit behaviour)
    if score < 75:
        profile = db.read_profile()
        profile = db.update_weak_topics(profile, [req.topic])
        db.write_profile(profile)

    return {**result, "correct": correct, "total": total, "score": score,
            "stat": db.get_topic_stat(_topic_id(req.topic))}


@router.get("/progress")
def progress():
    return {"topics": db.get_all_topic_stats()}


@router.post("/suggest")
def suggest():
    profile = db.read_profile()
    return {"suggestion": ai.suggest_next_topic(profile["level"], profile["weak_topics"])}
