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

  if (loading) return <div className="animate-pulse text-slate-400">Preparing your placement test…</div>;
  if (error) return <div className="card border-red-300 text-red-600">Error: {error}</div>;

  const answered = answers.filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="card grad text-white">
        <h1 className="text-2xl font-bold">🎯 Placement Test</h1>
        <p className="mt-1 text-sm opacity-90">
          Answer these 10 questions so we can find your French level. Don&apos;t worry if you don&apos;t know some — just do your best!
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/30">
          <div
            className="h-full rounded-full bg-white transition-all"
            style={{ width: `${(answered / questions.length) * 100}%` }}
          />
        </div>
        <p className="mt-1 text-xs opacity-75">{answered}/{questions.length} answered</p>
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="card space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-indigo-500">
              Question {i + 1} · {q.level} · {q.topic}
            </span>
            {answers[i] && <span className="text-green-500 text-xs font-medium">✓ Answered</span>}
          </div>
          <p className="font-medium">{q.question}</p>
          <div className="space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${
                  answers[i] === opt
                    ? "border-indigo-400 bg-indigo-50 dark:bg-indigo-950"
                    : "border-slate-200 hover:border-indigo-200 dark:border-slate-700"
                }`}
              >
                <input
                  type="radio"
                  name={`q${q.id}`}
                  checked={answers[i] === opt}
                  onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                  className="accent-indigo-500"
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
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          <Send size={18} />
          {submitting ? "Evaluating…" : answered < questions.length ? `Answer all questions (${answered}/${questions.length})` : "Submit & Find My Level"}
        </button>
      )}
    </div>
  );
}
