"use client";

import { useCallback, useEffect, useState } from "react";
import { api, SrsItem, SrsStats } from "@/lib/api";
import { speak } from "@/lib/audio";
import { ArrowLeftRight, Eye, EyeOff, Plus, Sparkles, Volume2 } from "lucide-react";

type Panel = "manual" | "progress" | "frequency";
type Direction = "fr-tr" | "tr-fr";

export default function KartlarPage() {
  const [due, setDue] = useState<SrsItem[]>([]);
  const [stats, setStats] = useState<SrsStats | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [panel, setPanel] = useState<Panel>("manual");
  const [allMode, setAllMode] = useState(false);
  const [direction, setDirection] = useState<Direction>("fr-tr");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [count, setCount] = useState(10);

  const load = useCallback(async (all = false) => {
    const data = await api.get<{ due: SrsItem[]; stats: SrsStats }>(
      `/api/srs/due${all ? "?all=true" : ""}`
    );
    setDue(data.due);
    setStats(data.stats);
    setIdx(0);
    setRevealed(false);
  }, []);

  useEffect(() => {
    load(allMode).catch((e) => setMsg((e as Error).message));
  }, [load, allMode]);

  async function answer(score: number) {
    await api.post("/api/srs/answer", { word: item.word, score });
    advance();
  }

  async function suspend() {
    await api.post("/api/srs/suspend", { word: item.word, suspended: true });
    setDue((prev) => prev.filter((_, i) => i !== idx));
    setRevealed(false);
    if (idx >= due.length - 1) setIdx(Math.max(0, due.length - 2));
    load(allMode);
  }

  function advance() {
    if (idx + 1 >= due.length) {
      load(allMode);
    } else {
      setIdx(idx + 1);
      setRevealed(false);
    }
  }

  async function addManual() {
    if (!word || !meaning) return;
    const r = await api.post<{ added: boolean }>("/api/srs/add", { word, meaning, example });
    setMsg(r.added ? `✅ '${word}' added` : "⚠️ Already in your list");
    setWord(""); setMeaning(""); setExample("");
    load(allMode);
  }

  async function addAI(mode: "progress" | "frequency") {
    setLoading(true);
    setMsg("");
    try {
      const r = await api.post<{ added_count: number; suggestions: { word: string; meaning: string }[] }>(
        "/api/srs/suggest", { mode, count }
      );
      setMsg(`✅ ${r.added_count} new words added: ${r.suggestions.map((s) => s.word).join(", ")}`);
      load(allMode);
    } catch (e) {
      setMsg(`Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  }

  const item = due[idx];
  const ease = item?.ease ?? 2.5;
  const inter = item?.interval ?? 1;
  const nextInterval = [
    "Tomorrow",
    `${inter} day${inter !== 1 ? "s" : ""}`,
    `${Math.max(1, Math.floor(inter * ease))} days`,
    `${Math.max(1, Math.floor(inter * ease * 1.3))} days`,
  ];

  const isFrFirst = direction === "fr-tr";
  const front = item ? (isFrFirst ? item.word : item.meaning) : "";
  const back  = item ? (isFrFirst ? item.meaning : item.word) : "";
  const frontLabel = isFrFirst ? "French" : "Translation";
  const backLabel  = isFrFirst ? "Translation" : "French";

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="eyebrow">Spaced Repetition · SRS</p>
        <h1 className="page-title">Flashcards</h1>
        <p className="page-sub">Lock words into long-term memory with scientifically-spaced review.</p>
      </div>

      {/* Stats mini bar */}
      {stats && (
        <div className="stats-mini">
          {[
            { label: "Due", value: due.length, color: "text-amber-600 dark:text-amber-400" },
            { label: "Total", value: stats.total, color: "" },
            { label: "Learned", value: stats.learned, color: "text-green-600 dark:text-green-400" },
            { label: "Suspended", value: stats.suspended, color: "text-muted-foreground" },
          ].map(({ label, value, color }) => (
            <div key={label} className="stats-mini-cell">
              <div className={`stats-mini-num ${color}`}>{value}</div>
              <div className="stats-mini-lbl">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Add words panel */}
      <div className="card overflow-hidden">
        {/* Panel tabs */}
        <div className="flex border-b border-border">
          {(["manual", "progress", "frequency"] as Panel[]).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={`flex-1 py-3 text-[12px] font-semibold transition ${
                panel === p
                  ? "border-b-2 border-slate-700 text-slate-700 dark:text-slate-400"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {p === "manual" ? "✍️ Manual" : p === "progress" ? "🤖 AI Progress" : "📊 Frequent"}
            </button>
          ))}
        </div>
        <div className="p-4 space-y-3">
          {panel === "manual" ? (
            <div className="grid gap-2 md:grid-cols-4">
              <input className="input" placeholder="le chat" value={word} onChange={(e) => setWord(e.target.value)} />
              <input className="input" placeholder="cat" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
              <input className="input" placeholder="Le chat dort. (optional)" value={example} onChange={(e) => setExample(e.target.value)} />
              <button onClick={addManual} className="btn-primary flex items-center justify-center gap-1.5">
                <Plus size={15} /> Add
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <input
                type="range" min={5} max={20} value={count}
                onChange={(e) => setCount(+e.target.value)}
                className="flex-1 accent-slate-700"
              />
              <span className="w-20 text-sm text-muted-foreground">{count} words</span>
              <button onClick={() => addAI(panel)} disabled={loading} className="btn-primary flex items-center gap-1.5 shrink-0">
                <Sparkles size={15} /> {loading ? "Adding…" : "Add with AI"}
              </button>
            </div>
          )}
          {msg && <p className="text-sm text-muted-foreground">{msg}</p>}
        </div>
      </div>

      {/* Review controls */}
      <div className="flex gap-2">
        <button
          onClick={() => setAllMode((v) => !v)}
          className={`flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
            allMode
              ? "bg-slate-700 text-white shadow-sm shadow-slate-700/30"
              : "border border-border text-muted-foreground hover:border-slate-600/40 hover:text-foreground"
          }`}
        >
          {allMode ? "📚 All Cards" : "📅 Due Today"}
        </button>
        <button
          onClick={() => { setDirection((d) => (d === "fr-tr" ? "tr-fr" : "fr-tr")); setRevealed(false); }}
          className="flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:border-slate-600/40 hover:text-foreground transition"
        >
          <ArrowLeftRight size={14} />
          {isFrFirst ? "FR → TR/EN" : "TR/EN → FR"}
        </button>
      </div>

      {/* Card review */}
      {!item ? (
        <div className="card p-8 text-center text-muted-foreground text-sm">
          {allMode ? "No cards yet — add some above!" : 'All done for today! Switch to "All Cards" to keep going.'}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Progress bar */}
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${(idx / due.length) * 100}%` }} />
          </div>
          <p className="text-center text-xs text-muted-foreground">Card {idx + 1} / {due.length}</p>

          {/* Front face */}
          <div className="card p-8 text-center space-y-4">
            <p className="eyebrow">{isFrFirst ? "🇫🇷" : "🌐"} {frontLabel}</p>
            <div className="text-4xl font-black tracking-tight">{front}</div>
            {isFrFirst && (
              <button
                onClick={() => speak(item.word)}
                className="mx-auto flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition"
              >
                <Volume2 size={15} /> Listen
              </button>
            )}
          </div>

          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn-primary w-full flex items-center justify-center gap-2">
              <Eye size={16} /> Reveal Answer
            </button>
          ) : (
            <>
              {/* Back face */}
              <div className="card p-6 text-center space-y-2 border-green-400 dark:border-green-700">
                <p className="eyebrow">{isFrFirst ? "🌐" : "🇫🇷"} {backLabel}</p>
                <div className="text-2xl font-bold">{back}</div>
                {item.example && <p className="text-sm italic text-muted-foreground">{item.example}</p>}
                {!isFrFirst && (
                  <button onClick={() => speak(item.word)} className="mx-auto flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition">
                    <Volume2 size={15} /> Listen
                  </button>
                )}
              </div>

              <p className="text-center text-xs text-muted-foreground">How well did you remember?</p>

              {/* SRS rating buttons */}
              <div className="grid grid-cols-4 gap-2">
                {[
                  { emoji: "😵", label: "Again", cls: "bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/60" },
                  { emoji: "😓", label: "Hard",  cls: "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/60" },
                  { emoji: "🙂", label: "Good",  cls: "bg-slate-700 text-white hover:bg-slate-800 shadow-sm shadow-slate-700/30" },
                  { emoji: "😄", label: "Easy",  cls: "bg-green-100 text-green-700 dark:bg-green-950/60 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/60" },
                ].map((b, score) => (
                  <button
                    key={b.label}
                    onClick={() => answer(score)}
                    className={`rounded-xl px-2 py-3 text-sm font-semibold transition active:scale-95 ${b.cls}`}
                  >
                    <div>{b.emoji} {b.label}</div>
                    <div className="text-[10px] font-normal opacity-70 mt-0.5">{nextInterval[score]}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={suspend}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-xs text-muted-foreground transition hover:border-red-400/50 hover:text-red-500"
              >
                <EyeOff size={13} /> Never show this word again
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
