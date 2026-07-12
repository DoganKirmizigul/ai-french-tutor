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

  function toggleAllMode() {
    const next = !allMode;
    setAllMode(next);
  }

  function toggleDirection() {
    setDirection((d) => (d === "fr-tr" ? "tr-fr" : "fr-tr"));
    setRevealed(false);
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
      <h1 className="text-2xl font-bold">🃏 Flashcards</h1>

      {stats && (
        <div className="grid grid-cols-4 gap-3">
          <div className="card text-center"><div className="text-2xl font-bold">{due.length}</div><div className="text-xs text-slate-500">Due</div></div>
          <div className="card text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-slate-500">Total</div></div>
          <div className="card text-center"><div className="text-2xl font-bold">{stats.learned}</div><div className="text-xs text-slate-500">Learned</div></div>
          <div className="card text-center"><div className="text-2xl font-bold text-slate-400">{stats.suspended}</div><div className="text-xs text-slate-500">Suspended</div></div>
        </div>
      )}

      {/* Add words panel */}
      <div className="card space-y-3">
        <div className="flex gap-2">
          {(["manual", "progress", "frequency"] as Panel[]).map((p) => (
            <button
              key={p}
              onClick={() => setPanel(p)}
              className={`rounded-xl px-3 py-1.5 text-sm font-medium ${panel === p ? "grad text-white" : "bg-slate-100 dark:bg-slate-800"}`}
            >
              {p === "manual" ? "✍️ Manual" : p === "progress" ? "🤖 Progress-Based" : "📊 Most Frequent"}
            </button>
          ))}
        </div>

        {panel === "manual" ? (
          <div className="grid gap-2 md:grid-cols-4">
            <input className="input" placeholder="le chat" value={word} onChange={(e) => setWord(e.target.value)} />
            <input className="input" placeholder="cat" value={meaning} onChange={(e) => setMeaning(e.target.value)} />
            <input className="input" placeholder="Le chat dort. (optional)" value={example} onChange={(e) => setExample(e.target.value)} />
            <button onClick={addManual} className="btn-primary flex items-center justify-center gap-1">
              <Plus size={16} /> Add
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <input
              type="range" min={5} max={20} value={count}
              onChange={(e) => setCount(+e.target.value)}
              className="flex-1 accent-indigo-500"
            />
            <span className="w-20 text-sm">{count} words</span>
            <button onClick={() => addAI(panel)} disabled={loading} className="btn-primary flex items-center gap-1">
              <Sparkles size={16} /> {loading ? "Adding…" : "Add with AI"}
            </button>
          </div>
        )}
        {msg && <p className="text-sm text-slate-500">{msg}</p>}
      </div>

      {/* Review controls */}
      <div className="flex gap-2">
        <button
          onClick={toggleAllMode}
          className={`flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition ${
            allMode ? "grad text-white" : "bg-slate-100 dark:bg-slate-800"
          }`}
        >
          {allMode ? "📚 All Cards" : "📅 Due Today"}
        </button>
        <button
          onClick={toggleDirection}
          className="flex items-center gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm font-medium transition dark:bg-slate-800"
        >
          <ArrowLeftRight size={14} />
          {isFrFirst ? "FR → TR/EN" : "TR/EN → FR"}
        </button>
      </div>

      {/* Card review */}
      {!item ? (
        <div className="card text-center text-slate-500">
          {allMode ? "No cards yet — add some above!" : 'All done for today! Switch to "All Cards" to keep going.'}
        </div>
      ) : (
        <div className="space-y-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="grad h-full transition-all" style={{ width: `${(idx / due.length) * 100}%` }} />
          </div>
          <p className="text-center text-xs text-slate-400">Card {idx + 1} / {due.length}</p>

          {/* Front */}
          <div className="card py-10 text-center">
            <div className="mb-2 text-xs text-slate-400">{isFrFirst ? "🇫🇷" : "🌐"} {frontLabel}</div>
            <div className="text-4xl font-bold tracking-wide">{front}</div>
            {isFrFirst && (
              <button
                onClick={() => speak(item.word)}
                className="btn-ghost mx-auto mt-4 flex items-center gap-2 text-sm"
              >
                <Volume2 size={16} /> Listen
              </button>
            )}
          </div>

          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn-primary flex w-full items-center justify-center gap-2">
              <Eye size={18} /> Reveal Answer
            </button>
          ) : (
            <>
              {/* Back */}
              <div className="card border-green-300 py-6 text-center dark:border-green-800">
                <div className="mb-1 text-xs text-slate-400">{isFrFirst ? "🌐" : "🇫🇷"} {backLabel}</div>
                <div className="text-2xl font-semibold">{back}</div>
                {item.example && <div className="mt-2 text-sm italic text-slate-500">{item.example}</div>}
                {!isFrFirst && (
                  <button onClick={() => speak(item.word)} className="btn-ghost mx-auto mt-3 flex items-center gap-2 text-sm">
                    <Volume2 size={16} /> Listen
                  </button>
                )}
              </div>

              <p className="text-center text-xs text-slate-400">How well did you remember?</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { emoji: "😵", label: "Again", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
                  { emoji: "😓", label: "Hard",  cls: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
                  { emoji: "🙂", label: "Good",  cls: "grad text-white" },
                  { emoji: "😄", label: "Easy",  cls: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
                ].map((b, score) => (
                  <button
                    key={b.label}
                    onClick={() => answer(score)}
                    className={`rounded-xl px-2 py-3 text-sm font-semibold transition active:scale-95 ${b.cls}`}
                  >
                    <div>{b.emoji} {b.label}</div>
                    <div className="text-[10px] font-normal opacity-70">{nextInterval[score]}</div>
                  </button>
                ))}
              </div>

              <button
                onClick={suspend}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 py-2 text-xs text-slate-400 transition hover:border-red-300 hover:text-red-400 dark:border-slate-700"
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
