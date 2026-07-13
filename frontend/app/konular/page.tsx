"use client";

import { useState, useEffect, useCallback } from "react";
import { api, TopicStat } from "@/lib/api";
import { BookOpen, Search, Sparkles, History, X, Clock } from "lucide-react";

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

interface HistoryEntry {
  id: string;
  topic: string;
  level: string;
  explanation: Explanation;
  stat: TopicStat | null;
  savedAt: number;
}

const LEVELS = ["A1", "A2", "B1", "B2"];
const STORAGE_KEY = "konular_state";
const HISTORY_KEY = "konular_history";
const MAX_HISTORY = 30;

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

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch { return []; }
}

function saveHistory(entries: HistoryEntry[]) {
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries.slice(0, MAX_HISTORY)));
}

function formatRelative(ts: number) {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  return `${days}d ago`;
}

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
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Restore state from localStorage on mount
  useEffect(() => {
    setHistory(loadHistory());
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const s = JSON.parse(saved);
        if (s.topic) setTopic(s.topic);
        if (s.input) setInput(s.input);
        if (s.level) setLevel(s.level);
        if (s.explanation) setExplanation(s.explanation);
        if (s.stat) setStat(s.stat);
      }
    } catch {}
    setHydrated(true);
  }, []);

  // Persist current session to localStorage whenever explanation changes
  useEffect(() => {
    if (!hydrated) return;
    if (explanation) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ topic, input, level, explanation, stat }));
    }
  }, [explanation, topic, level, stat, hydrated, input]);

  const addToHistory = useCallback((entry: Omit<HistoryEntry, "id" | "savedAt">) => {
    setHistory((prev) => {
      // Replace if same topic+level already exists
      const filtered = prev.filter((h) => !(h.topic === entry.topic && h.level === entry.level));
      const next = [
        { ...entry, id: `${Date.now()}`, savedAt: Date.now() },
        ...filtered,
      ];
      saveHistory(next);
      return next;
    });
  }, []);

  function loadEntry(entry: HistoryEntry) {
    setTopic(entry.topic);
    setInput(entry.topic);
    setLevel(entry.level);
    setExplanation(entry.explanation);
    setStat(entry.stat);
    setQuestions(null);
    setResult(null);
    setError("");
    setDrawerOpen(false);
  }

  function deleteEntry(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    setHistory((prev) => {
      const next = prev.filter((h) => h.id !== id);
      saveHistory(next);
      return next;
    });
  }

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
      addToHistory({ topic: topicName, level, explanation: r.explanation, stat: r.stat });
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

  const HistoryList = () => (
    <div className="flex flex-col gap-1 flex-1 overflow-y-auto">
      {history.length === 0 && (
        <p className="px-2 py-3 text-xs text-muted-foreground">No history yet — explain a topic first.</p>
      )}
      {history.map((h) => (
        <button
          key={h.id}
          onClick={() => loadEntry(h)}
          className={`group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${
            topic === h.topic && level === h.level && explanation
              ? "bg-violet-700/10 text-violet-700 dark:text-violet-400"
              : "hover:bg-muted"
          }`}
        >
          <Clock size={11} className="mt-0.5 shrink-0 opacity-40" />
          <span className="flex-1 min-w-0">
            <span className="block truncate font-semibold">{h.topic}</span>
            <span className="text-muted-foreground">{h.level} · {formatRelative(h.savedAt)}</span>
          </span>
          <X
            size={11}
            onClick={(e) => deleteEntry(h.id, e)}
            className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 text-red-500 transition"
          />
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex gap-4">

      {/* Mobile history drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative flex w-72 max-w-[85vw] flex-col gap-2 bg-background p-4 shadow-2xl border-r border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">History</span>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <HistoryList />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      {history.length > 0 && (
        <aside className="hidden w-52 shrink-0 flex-col gap-2 md:flex">
          <p className="eyebrow px-1">History</p>
          <HistoryList />
        </aside>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 space-y-6">

        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="eyebrow">Grammar · Vocabulary</p>
            <h1 className="page-title">Topics</h1>
            <p className="page-sub">Explore any French grammar topic and test yourself with a mini quiz.</p>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition md:hidden mt-1"
            >
              <History size={14} /> History
            </button>
          )}
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
    </div>
  );
}
