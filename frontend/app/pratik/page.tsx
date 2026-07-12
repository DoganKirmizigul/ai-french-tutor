"use client";

import { useState } from "react";
import { api, Exercise, ExerciseResult } from "@/lib/api";
import { Dices, Send } from "lucide-react";

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
      <h1 className="text-2xl font-bold">✏️ Practice Exercises</h1>

      <div className="flex gap-3">
        <button onClick={generate} disabled={loading} className="btn-primary flex flex-1 items-center justify-center gap-2">
          <Dices size={18} /> {loading && exercises.length === 0 ? "Preparing…" : "Generate New Exercises"}
        </button>
        <select value={count} onChange={(e) => setCount(+e.target.value)} className="input w-28">
          {[3, 5, 7].map((n) => (
            <option key={n} value={n}>{n} questions</option>
          ))}
        </select>
      </div>

      {error && <div className="card border-red-300 text-sm text-red-600">{error}</div>}

      {exercises.length === 0 && !loading && (
        <div className="card border-l-4 border-l-indigo-500 text-sm text-slate-600 dark:text-slate-300">
          <strong>How it works:</strong> The AI analyzes your error log and generates personalized questions
          focused on your weak topics. Submit your answers to receive detailed feedback.
        </div>
      )}

      {exercises.map((ex, i) => {
        const res = result?.results.find((r) => r.id === ex.id);
        return (
          <div key={ex.id} className={`card ${res ? (res.correct ? "border-green-400" : "border-red-400") : ""}`}>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
                {i + 1}. {ex.type} · {ex.topic}
              </span>
              {res && <span>{res.correct ? "✅" : "❌"}</span>}
            </div>
            <p className="mb-3 font-medium">{ex.question}</p>

            {ex.options ? (
              <div className="space-y-2">
                {ex.options.map((opt) => (
                  <label key={opt} className="flex cursor-pointer items-center gap-2 text-sm">
                    <input
                      type="radio"
                      name={`q${ex.id}`}
                      checked={answers[i] === opt}
                      onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                      disabled={!!result}
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

            {ex.hint && !result && <p className="mt-2 text-xs text-slate-400">💡 {ex.hint}</p>}

            {res && (
              <div className={`mt-3 rounded-xl p-3 text-sm ${res.correct ? "bg-green-50 dark:bg-green-950" : "bg-red-50 dark:bg-red-950"}`}>
                {!res.correct && (
                  <p className="mb-1">
                    <strong>Correct answer:</strong> {res.correct_answer}
                  </p>
                )}
                {res.feedback}
              </div>
            )}
          </div>
        );
      })}

      {exercises.length > 0 && !result && (
        <button onClick={check} disabled={loading} className="btn-primary flex w-full items-center justify-center gap-2">
          <Send size={18} /> {loading ? "Evaluating…" : "Submit Answers"}
        </button>
      )}

      {result && (
        <div className="card grad text-center text-white">
          <div className="text-3xl font-bold">
            {result.correct}/{result.total}
          </div>
          <p className="text-sm opacity-90">correct answers</p>
          {result.new_badges.length > 0 && (
            <p className="mt-2 text-sm">🎉 New badge: {result.new_badges.join(", ")}</p>
          )}
          <button onClick={generate} className="mt-3 rounded-xl bg-white/20 px-4 py-2 text-sm font-semibold hover:bg-white/30">
            Generate New Set
          </button>
        </div>
      )}
    </div>
  );
}
