"use client";

import { useState } from "react";
import { api, Exercise, ExerciseResult } from "@/lib/api";
import { CheckCircle2, Dices, Send, XCircle } from "lucide-react";

interface CheckResponse {
  results: ExerciseResult[];
  correct: number;
  total: number;
  new_badges: string[];
}

export default function PratikPage() {
  const [count, setCount] = useState(3);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [result, setResult] = useState<CheckResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function generate() {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await api.post<{ exercises: Exercise[] }>("/api/exercises/generate", { adet: count });
      setExercises(data.exercises);
      setAnswers(new Array(data.exercises.length).fill(""));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function check() {
    setLoading(true);
    setError("");
    try {
      const data = await api.post<CheckResponse>("/api/exercises/check", { exercises, answers });
      setResult(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">AI · Personalized</p>
          <h1 className="page-title">Practice Exercises</h1>
          <p className="page-sub">Questions tailored to your weak spots, generated fresh each time.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={count}
            onChange={(e) => setCount(+e.target.value)}
            className="input !w-36"
          >
            {[3, 5, 7].map((n) => (
              <option key={n} value={n}>{n} questions</option>
            ))}
          </select>
          <button
            onClick={generate}
            disabled={loading}
            className="btn-primary flex items-center gap-2"
          >
            <Dices size={16} />
            {loading && exercises.length === 0 ? "Preparing…" : "Generate"}
          </button>
        </div>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400">
          {error}
        </div>
      )}

      {exercises.length === 0 && !loading && (
        <div className="card p-5 border-l-4 border-l-slate-600">
          <p className="text-sm text-muted-foreground">
            <strong className="text-foreground font-semibold">How it works —</strong>{" "}
            The AI analyses your error log and generates personalised questions focused on your
            weak topics. Submit your answers for detailed feedback.
          </p>
        </div>
      )}

      {exercises.map((ex, i) => {
        const res = result?.results.find((r) => r.id === ex.id);
        return (
          <div
            key={ex.id}
            className={`card p-5 space-y-4 ${
              res ? (res.correct ? "border-green-400 dark:border-green-700" : "border-red-400 dark:border-red-700") : ""
            }`}
          >
            {/* Question header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-700/10 text-[11px] font-bold text-slate-700 dark:bg-slate-400/15 dark:text-slate-400">
                  {i + 1}
                </span>
                <span className="eyebrow">{ex.type} · {ex.topic}</span>
              </div>
              {res && (
                res.correct
                  ? <CheckCircle2 size={18} className="text-green-500" />
                  : <XCircle size={18} className="text-red-500" />
              )}
            </div>

            <p className="font-semibold text-[15px] leading-snug">{ex.question}</p>

            {ex.options ? (
              <div className="space-y-2">
                {ex.options.map((opt) => (
                  <label
                    key={opt}
                    className={`opt-label ${answers[i] === opt ? "selected" : ""}`}
                  >
                    <input
                      type="radio"
                      name={`q${ex.id}`}
                      checked={answers[i] === opt}
                      onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                      disabled={!!result}
                      className="accent-slate-700"
                    />
                    {opt}
                  </label>
                ))}
              </div>
            ) : (
              <input
                className="input"
                placeholder="Type your answer…"
                value={answers[i] ?? ""}
                onChange={(e) => setAnswers((a) => a.map((v, j) => (j === i ? e.target.value : v)))}
                disabled={!!result}
              />
            )}

            {ex.hint && !result && (
              <p className="text-xs text-muted-foreground">💡 {ex.hint}</p>
            )}

            {res && (
              <div className={`rounded-xl p-3.5 text-sm ${res.correct ? "bg-green-50 dark:bg-green-950/40" : "bg-red-50 dark:bg-red-950/30"}`}>
                {!res.correct && (
                  <p className="mb-1 font-semibold">
                    Correct answer:{" "}
                    <span className="text-green-600 dark:text-green-400">{res.correct_answer}</span>
                  </p>
                )}
                <p className="text-muted-foreground">{res.feedback}</p>
              </div>
            )}
          </div>
        );
      })}

      {exercises.length > 0 && !result && (
        <button
          onClick={check}
          disabled={loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Send size={16} />
          {loading ? "Evaluating…" : "Submit Answers"}
        </button>
      )}

      {result && (
        <div className="result-card space-y-3">
          <div className="text-5xl font-black tracking-tight">{result.correct}/{result.total}</div>
          <p className="text-sm opacity-80">correct answers</p>
          {result.new_badges.length > 0 && (
            <p className="text-sm opacity-90">🎉 New badge: {result.new_badges.join(", ")}</p>
          )}
          <div className="h-px bg-white/20 my-2" />
          <button
            onClick={generate}
            className="rounded-xl border border-white/30 px-5 py-2 text-sm font-semibold text-white transition hover:bg-white/15"
          >
            Generate New Set
          </button>
        </div>
      )}
    </div>
  );
}
