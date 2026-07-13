"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

interface Question {
  id: number;
  question: string;
  options: string[];
  level: string;
  topic: string;
}

export default function PlacementPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    api.get<{ questions: Question[] }>("/api/exercises/placement")
      .then((r) => {
        setQuestions(r.questions);
        setAnswers(new Array(r.questions.length).fill(""));
      })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false));
  }, []);

  async function submit() {
    setSubmitting(true);
    try {
      const r = await api.post<{ level: string }>("/api/exercises/placement/evaluate", {
        questions, answers,
      });
      router.push(`/?placed=${r.level}`);
    } catch (e) {
      setError((e as Error).message);
      setSubmitting(false);
    }
  }

  if (loading) return (
    <div className="flex items-center gap-3 py-16 text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-violet-700 border-t-transparent" />
      <span className="text-sm font-medium">Preparing your placement test…</span>
    </div>
  );

  if (error) return (
    <div className="card p-5 text-sm text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400">
      Error: {error}
    </div>
  );

  const answered = answers.filter(Boolean).length;
  const pct = Math.round((answered / Math.max(questions.length, 1)) * 100);

  return (
    <div className="space-y-6">

      {/* Hero */}
      <div className="result-card text-left space-y-4">
        <div>
          <p className="eyebrow" style={{ color: "rgba(255,255,255,0.65)" }}>Assessment · Level Detection</p>
          <h1 className="text-2xl font-black tracking-tight mt-2" style={{ letterSpacing: "-0.04em" }}>
            Placement Test
          </h1>
          <p className="text-sm mt-2 opacity-75">
            Answer these {questions.length} questions so we can find your French level. Do your best!
          </p>
        </div>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-white/20 mb-2">
            <div className="h-full rounded-full bg-white transition-all duration-500" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-xs opacity-60">{answered}/{questions.length} answered</p>
        </div>
      </div>

      {/* Questions */}
      {questions.map((q, i) => (
        <div key={q.id} className="card p-5 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-violet-700/10 text-[11px] font-bold text-violet-700 dark:bg-violet-400/15 dark:text-violet-400">
                {i + 1}
              </span>
              <span className="eyebrow">{q.level} · {q.topic}</span>
            </div>
            {answers[i] && (
              <span className="text-xs font-semibold text-green-600 dark:text-green-400">✓ Answered</span>
            )}
          </div>

          <p className="font-semibold text-[15px] leading-snug">{q.question}</p>

          <div className="space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt}
                className={`opt-label ${answers[i] === opt ? "selected" : ""}`}
              >
                <input
                  type="radio"
                  name={`q${q.id}`}
                  checked={answers[i] === opt}
                  onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                  className="accent-violet-700"
                />
                {opt}
              </label>
            ))}
          </div>
        </div>
      ))}

      {questions.length > 0 && (
        <button
          onClick={submit}
          disabled={submitting || answered < questions.length}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Send size={16} />
          {submitting
            ? "Evaluating…"
            : answered < questions.length
              ? `Answer all questions (${answered}/${questions.length})`
              : "Submit & Find My Level"}
        </button>
      )}
    </div>
  );
}
