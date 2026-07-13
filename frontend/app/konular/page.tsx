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

const statusColor: Record<string, string> = {
  mastered: "text-green-600", good: "text-blue-600",
  improving: "text-amber-600", weak: "text-red-500", not_started: "text-muted-foreground",
};
const statusLabel: Record<string, string> = {
  mastered: "Mastered", good: "Good",
  improving: "Improving", weak: "Needs work", not_started: "New",
};
const statusDot: Record<string, string> = {
  mastered: "bg-green-500", good: "bg-blue-500",
  improving: "bg-amber-500", weak: "bg-red-500", not_started: "bg-neutral-300",
};

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

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="eyebrow">Grammar · Vocabulary</p>
        <h1 className="page-title">Topics</h1>
        <p className="page-sub">Explore any French grammar topic and test yourself with a mini quiz.</p>
      </div>

      {/* Search card */}
      <div className="card p-5 space-y-3">
        <form
          onSubmit={(e) => { e.preventDefault(); if (input.trim()) explain(input.trim()); }}
          className="flex gap-2"
        >
          <input
            className="input flex-1 min-w-0"
            placeholder="e.g. aller verb, passé composé, conjunctions…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <select value={level} onChange={(e) => setLevel(e.target.value)} className="input !w-20 shrink-0">
            {LEVELS.map((l) => <option key={l}>{l}</option>)}
          </select>
          <button type="submit" disabled={loading === "explain"} className="btn-primary flex items-center gap-1.5 shrink-0">
            <Search size={15} /> Explain
          </button>
        </form>
        <button
          onClick={suggest}
          disabled={!!loading}
          className="w-full flex items-center justify-center gap-2 rounded-[12px] border border-border py-2.5 text-sm font-medium text-muted-foreground transition hover:border-violet-600/40 hover:text-violet-700 dark:hover:text-violet-400"
        >
          <Sparkles size={15} />
          {loading === "suggest" ? "AI thinking…" : "Suggest a topic with AI"}
        </button>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400">{error}</div>
      )}

      {loading === "explain" && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-violet-700 border-t-transparent" />
          Preparing &quot;{topic}&quot;…
        </div>
      )}

      {explanation && (
        <div className="space-y-5">

          {/* Topic title + status */}
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-xl font-bold tracking-tight">{explanation.title || topic}</h2>
            {stat && (
              <span className={`flex items-center gap-1.5 text-sm font-semibold ${statusColor[stat.status]}`}>
                <span className={`h-2 w-2 rounded-full ${statusDot[stat.status]}`} />
                {statusLabel[stat.status]}
                {stat.attempt_count > 0 && ` · ${stat.average}% · ${stat.attempt_count} attempts`}
              </span>
            )}
          </div>

          {/* Explanation card */}
          <div className="card p-5 space-y-5">
            <p className="italic text-muted-foreground text-sm leading-relaxed">{explanation.summary}</p>

            <div>
              <p className="eyebrow mb-2">Main Rule</p>
              <p className="text-sm leading-relaxed">{explanation.main_rule}</p>
            </div>

            {explanation.formula && (
              <code className="block rounded-xl bg-violet-50 dark:bg-violet-950/30 border border-violet-200/60 dark:border-violet-800/40 px-4 py-3 text-sm font-mono text-violet-800 dark:text-violet-300">
                {explanation.formula}
              </code>
            )}

            {explanation.sub_rules?.map((sr) => (
              <div key={sr.title} className="border-l-[3px] border-violet-600 pl-4 space-y-1">
                <p className="font-semibold text-sm">{sr.title}</p>
                <p className="text-sm text-muted-foreground">{sr.explanation}</p>
                {sr.example_fr && (
                  <p className="text-sm mt-1">
                    <em className="text-foreground">{sr.example_fr}</em>
                    <br />
                    <span className="text-xs text-muted-foreground">{sr.example_tr}</span>
                  </p>
                )}
              </div>
            ))}

            {explanation.examples?.length > 0 && (
              <div className="space-y-2">
                <p className="eyebrow">Examples</p>
                {explanation.examples.map((ex, i) => (
                  <div key={i} className="rounded-xl bg-violet-50 dark:bg-violet-950/20 border border-violet-200/50 dark:border-violet-800/30 px-4 py-3 text-sm">
                    <strong>{ex.fr}</strong>
                    {ex.note && <em className="text-muted-foreground"> · {ex.note}</em>}
                    <br />
                    <span className="text-xs text-muted-foreground">{ex.tr}</span>
                  </div>
                ))}
              </div>
            )}

            {explanation.common_mistakes?.length > 0 && (
              <div className="space-y-2">
                <p className="eyebrow">Common Mistakes</p>
                {explanation.common_mistakes.map((m, i) => (
                  <div key={i} className="rounded-xl bg-red-50 dark:bg-red-950/20 border border-red-200/50 dark:border-red-800/30 px-4 py-3 text-sm">
                    <del className="text-red-500">{m.wrong}</del>
                    {" → "}
                    <strong className="text-green-600 dark:text-green-400">{m.correct}</strong>
                    <br />
                    <span className="text-xs text-muted-foreground">{m.explanation}</span>
                  </div>
                ))}
              </div>
            )}

            {explanation.tip && (
              <div className="amber-card px-4 py-3 text-sm">
                <strong>💡 Tip:</strong> {explanation.tip}
              </div>
            )}
          </div>

          {/* Quiz CTA */}
          {!questions && !result && (
            <button
              onClick={startQuiz}
              disabled={loading === "quiz"}
              className="btn-primary w-full flex items-center justify-center gap-2"
            >
              <BookOpen size={16} />
              {loading === "quiz" ? "Preparing questions…" : "Start Mini Quiz (5 Questions)"}
            </button>
          )}

          {/* Quiz questions */}
          {questions && !result && (
            <div className="card p-5 space-y-6">
              {questions.map((q, i) => (
                <div key={q.id}>
                  <p className="font-semibold text-[14px] mb-3">{i + 1}. {q.question}</p>
                  {q.options ? (
                    <div className="space-y-2">
                      {q.options.map((opt) => (
                        <label key={opt} className={`opt-label ${answers[i] === opt ? "selected" : ""}`}>
                          <input
                            type="radio" name={`kq${q.id}`}
                            checked={answers[i] === opt}
                            onChange={() => setAnswers((a) => a.map((v, j) => (j === i ? opt : v)))}
                            className="accent-violet-700"
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
              <button
                onClick={checkQuiz}
                disabled={loading === "check"}
                className="btn-primary w-full"
              >
                {loading === "check" ? "Evaluating…" : "Submit Answers"}
              </button>
            </div>
          )}

          {/* Quiz results */}
          {result && (
            <div className="space-y-4">
              <div className={`card p-6 text-center space-y-2 ${result.score >= 75 ? "border-green-400 dark:border-green-700" : "border-amber-400 dark:border-amber-700"}`}>
                <div className="text-5xl font-black tracking-tight">{result.score}%</div>
                <p className="text-sm text-muted-foreground">{result.correct}/{result.total} correct</p>
                {result.summary && <p className="text-sm mt-2">{result.summary}</p>}
              </div>

              {result.results.map((r) => (
                <div key={r.id} className={`card p-4 text-sm space-y-1 ${!r.correct ? "border-red-300 dark:border-red-800" : ""}`}>
                  <p className="font-semibold">{r.correct ? "✅" : "❌"} Question {r.id}</p>
                  {!r.correct && (
                    <p>
                      Yours: <code className="bg-muted px-1 rounded text-xs">{r.user_answer || "(empty)"}</code>
                      {" → Correct: "}
                      <code className="bg-muted px-1 rounded text-xs">{r.correct_answer}</code>
                    </p>
                  )}
                  <p className="text-muted-foreground">{r.feedback}</p>
                </div>
              ))}

              {result.advice && (
                <div className="card p-4 text-sm border-violet-300 dark:border-violet-800 bg-violet-50/50 dark:bg-violet-950/20">
                  🎯 <strong>Next Step:</strong> {result.advice}
                </div>
              )}

              <div className="flex gap-3">
                <button onClick={startQuiz} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition">
                  Try Again
                </button>
                <button onClick={() => { setResult(null); setQuestions(null); }} className="flex-1 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-muted transition">
                  Back to Explanation
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
