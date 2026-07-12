"use client";

import { useState } from "react";
import { api, TopicStat } from "@/lib/api";
import { BookOpen, Search, Sparkles } from "lucide-react";

interface Explanation {
  title: string;
  summary: string;
  main_rule: string;
  formula: string;
  sub_rules: { title: string; explanation: string; example_fr: string; example_tr: string }[];
  examples: { fr: string; tr: string; note: string }[];
  common_mistakes: { wrong: string; correct: string; explanation: string }[];
  tip: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  type: string;
  options: string[] | null;
  answer: string;
}

interface QuizResult {
  results: { id: number; correct: boolean; user_answer: string; correct_answer: string; feedback: string }[];
  summary: string;
  advice: string;
  correct: number;
  total: number;
  score: number;
}

const LEVELS = ["A1", "A2", "B1", "B2"];

export default function KonularPage() {
  const [input, setInput] = useState("");
  const [level, setLevel] = useState("A1");
  const [topic, setTopic] = useState("");
  const [explanation, setExplanation] = useState<Explanation | null>(null);
  const [stat, setStat] = useState<TopicStat | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[] | null>(null);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");

  async function explain(topicName: string) {
    setLoading("explain");
    setError("");
    setExplanation(null);
    setQuestions(null);
    setResult(null);
    setTopic(topicName);
    try {
      const r = await api.post<{ explanation: Explanation; stat: TopicStat }>("/api/topics/explain", {
        topic: topicName, level,
      });
      setExplanation(r.explanation);
      setStat(r.stat);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  async function suggest() {
    setLoading("suggest");
    setError("");
    try {
      const r = await api.post<{ suggestion: { topic: string; reason: string } }>("/api/topics/suggest");
      if (r.suggestion.topic && r.suggestion.topic !== "Unknown") {
        await explain(r.suggestion.topic);
      } else {
        setError(r.suggestion.reason || "Could not get a suggestion");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  async function startQuiz() {
    setLoading("quiz");
    setError("");
    try {
      const r = await api.post<{ questions: QuizQuestion[] }>("/api/topics/quiz", { topic, level });
      setQuestions(r.questions);
      setAnswers(new Array(r.questions.length).fill(""));
      setResult(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  async function checkQuiz() {
    if (!questions) return;
    setLoading("check");
    try {
      const r = await api.post<QuizResult & { stat: TopicStat }>("/api/topics/quiz/check", {
        topic, questions, answers,
      });
      setResult(r);
      setStat(r.stat);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  const statusColor: Record<string, string> = {
    mastered: "text-green-500", good: "text-blue-500",
    improving: "text-orange-500", weak: "text-red-500", not_started: "text-slate-400",
  };
  const statusLabel: Record<string, string> = {
    mastered: "🟢 Mastered", good: "🔵 Good",
    improving: "🟡 Improving", weak: "🔴 Weak", not_started: "⬜ New",
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">📚 Topics</h1>

      <div className="card space-y-3">
        <form
          onSubmit={(e) => { e.preventDefault(); if (input.trim()) explain(input.trim()); }}
          className="flex gap-2"
        >
          <input
            className="input flex-1"
            placeholder="e.g. aller verb, conjunctions, passé composé…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="input w-20">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <button type="submit" disabled={loading === "explain"} className="btn-primary flex items-center gap-1">
            <Search size={16} /> Explain
          </button>
        </form>
        <button onClick={suggest} disabled={!!loading} className="btn-ghost flex w-full items-center justify-center gap-2 text-sm">
          <Sparkles size={16} /> {loading === "suggest" ? "AI thinking…" : "Suggest a Topic with AI"}
        </button>
      </div>

      {error && <div className="card border-red-300 text-sm text-red-600">{error}</div>}
      {loading === "explain" && <div className="animate-pulse text-slate-400">Preparing &quot;{topic}&quot;…</div>}

      {explanation && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">{explanation.title || topic}</h2>
            {stat && (
              <span className={`text-sm font-semibold ${statusColor[stat.status]}`}>
                {statusLabel[stat.status]}{stat.attempt_count > 0 && ` · ${stat.average}% · ${stat.attempt_count} attempts`}
              </span>
            )}
          </div>

          <div className="card space-y-4">
            <p className="italic text-slate-500">{explanation.summary}</p>
            <p><strong>Main Rule:</strong> {explanation.main_rule}</p>
            {explanation.formula && (
              <code className="block rounded-xl bg-slate-100 p-3 text-sm dark:bg-slate-800">{explanation.formula}</code>
            )}

            {explanation.sub_rules?.map((sr) => (
              <div key={sr.title} className="border-l-4 border-indigo-400 pl-3">
                <p className="font-semibold">{sr.title}</p>
                <p className="text-sm">{sr.explanation}</p>
                {sr.example_fr && (
                  <p className="mt-1 text-sm">🇫🇷 <em>{sr.example_fr}</em><br /><span className="text-xs text-slate-400">🇹🇷 {sr.example_tr}</span></p>
                )}
              </div>
            ))}

            {explanation.examples?.length > 0 && (
              <div>
                <p className="mb-2 font-semibold">Examples</p>
                {explanation.examples.map((ex, i) => (
                  <div key={i} className="mb-2 rounded-xl bg-indigo-50 p-3 text-sm dark:bg-indigo-950">
                    🇫🇷 <strong>{ex.fr}</strong>{ex.note && <em className="text-slate-400"> · {ex.note}</em>}
                    <br /><span className="text-xs text-slate-500">🇹🇷 {ex.tr}</span>
                  </div>
                ))}
              </div>
            )}

            {explanation.common_mistakes?.length > 0 && (
              <div>
                <p className="mb-2 font-semibold">⚠️ Common Mistakes</p>
                {explanation.common_mistakes.map((m, i) => (
                  <div key={i} className="mb-2 rounded-xl bg-red-50 p-3 text-sm dark:bg-red-950">
                    ❌ <del>{m.wrong}</del> → ✅ <strong>{m.correct}</strong>
                    <br /><span className="text-xs text-slate-500">{m.explanation}</span>
                  </div>
                ))}
              </div>
            )}

            {explanation.tip && (
              <div className="rounded-xl bg-amber-50 p-3 text-sm dark:bg-amber-950">💡 <strong>Tip:</strong> {explanation.tip}</div>
            )}
          </div>

          {!questions && !result && (
            <button onClick={startQuiz} disabled={loading === "quiz"} className="btn-primary flex w-full items-center justify-center gap-2">
              <BookOpen size={18} /> {loading === "quiz" ? "Preparing questions…" : "Start Mini Quiz (5 Questions)"}
            </button>
          )}

          {questions && !result && (
            <div className="card space-y-5">
              {questions.map((q, i) => (
                <div key={q.id}>
                  <p className="mb-2 font-medium">{i + 1}. {q.question}</p>
                  {q.options ? (
                    <div className="space-y-1.5">
                      {q.options.map((opt) => (
                        <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                          <input
                            type="radio" name={`kq${q.id}`}
                            checked={answers[i] === opt}
                            onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                          />
                          {opt}
                        </label>
                      ))}
                    </div>
                  ) : (
                    <input
                      className="input"
                      placeholder="Your answer in French…"
                      value={answers[i] ?? ""}
                      onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                    />
                  )}
                </div>
              ))}
              <button onClick={checkQuiz} disabled={loading === "check"} className="btn-primary w-full">
                {loading === "check" ? "Evaluating…" : "📝 Submit Answers"}
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className={`card text-center ${result.score >= 75 ? "border-green-400" : "border-orange-400"}`}>
                <div className="text-4xl">{result.score >= 90 ? "🎉" : result.score >= 75 ? "👏" : result.score >= 50 ? "💪" : "📖"}</div>
                <div className="text-3xl font-bold">{result.score}%</div>
                <div className="text-sm text-slate-500">{result.correct}/{result.total} correct</div>
                {result.summary && <p className="mt-2 text-sm">{result.summary}</p>}
              </div>

              {result.results.map((r) => (
                <div key={r.id} className={`card text-sm ${r.correct ? "" : "border-red-300"}`}>
                  <p className="font-medium">{r.correct ? "✅" : "❌"} Question {r.id}</p>
                  {!r.correct && <p className="mt-1">Yours: <code>{r.user_answer || "(empty)"}</code> → Correct: <code>{r.correct_answer}</code></p>}
                  <p className="mt-1 text-slate-500">{r.feedback}</p>
                </div>
              ))}

              {result.advice && <div className="card bg-indigo-50 text-sm dark:bg-indigo-950">🎯 <strong>Next Step:</strong> {result.advice}</div>}

              <div className="flex gap-2">
                <button onClick={startQuiz} className="btn-ghost flex-1">🔄 Try Again</button>
                <button onClick={() => { setResult(null); setQuestions(null); }} className="btn-ghost flex-1">📖 Back to Explanation</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
