"use client";

import { useCallback, useEffect, useState } from "react";
import { api, SrsItem, SrsStats } from "@/lib/api";
import { speak } from "@/lib/audio";
import { Eye, Plus, Sparkles, Volume2 } from "lucide-react";

type Panel = "manual" | "progress" | "frequency";

export default function KartlarPage() {
  const [due, setDue] = useState<SrsItem[]>([]);
  const [stats, setStats] = useState<SrsStats | null>(null);
  const [idx, setIdx] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [panel, setPanel] = useState<Panel>("manual");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  const [word, setWord] = useState("");
  const [meaning, setMeaning] = useState("");
  const [example, setExample] = useState("");
  const [count, setCount] = useState(10);

  const load = useCallback(async () => {
    const data = await api.get<{ due: SrsItem[]; stats: SrsStats }>("/api/srs/due");
    setDue(data.due);
    setStats(data.stats);
    setIdx(0);
    setRevealed(false);
  }, []);

  useEffect(() => {
    load().catch((e) => setMsg((e as Error).message));
  }, [load]);

  async function answer(score: number) {
    await api.post("/api/srs/answer", { word: item.word, score });
    if (idx + 1 >= due.length) {
      await load();
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
    load();
  }

  async function addAI(mode: "progress" | "frequency") {
    setLoading(true);
    setMsg("");
    try {
      const r = await api.post<{ added_count: number; suggestions: { word: string; meaning: string }[] }>(
        "/api/srs/suggest", { mode, count }
      );
      setMsg(`✅ ${r.added_count} new words added: ${r.suggestions.map((s) => s.word).join(", ")}`);
      load();
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🃏 Flashcards</h1>

      {stats && (
        <div className="grid grid-cols-3 gap-3">
          <div className="card text-center"><div className="text-2xl font-bold">{due.length}</div><div className="text-xs text-slate-500">Due</div></div>
          <div className="card text-center"><div className="text-2xl font-bold">{stats.total}</div><div className="text-xs text-slate-500">Total</div></div>
          <div className="card text-center"><div className="text-2xl font-bold">{stats.learned}</div><div className="text-xs text-slate-500">Learned</div></div>
        </div>
      )}

      <div className="card space-y-4">
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

      {!item ? (
        <div className="card text-center text-slate-500">🎉 You&apos;ve reviewed all cards for today!</div>
      ) : (
        <div className="space-y-3">
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
            <div className="grad h-full transition-all" style={{ width: `${(idx / due.length) * 100}%` }} />
          </div>
          <p className="text-center text-xs text-slate-400">Card {idx + 1} / {due.length}</p>

          <div className="card py-10 text-center">
            <div className="text-4xl font-bold tracking-wide">{item.word}</div>
            {item.source === "frequency" && <div className="mt-2 text-xs text-slate-400">📊 Frequency word</div>}
            <button
              onClick={() => speak(item.word)}
              className="btn-ghost mx-auto mt-4 flex items-center gap-2 text-sm"
            >
              <Volume2 size={16} /> Listen
            </button>
          </div>

          {!revealed ? (
            <button onClick={() => setRevealed(true)} className="btn-primary flex w-full items-center justify-center gap-2">
              <Eye size={18} /> Reveal Answer
            </button>
          ) : (
            <>
              <div className="card border-green-300 py-6 text-center dark:border-green-800">
                <div className="text-2xl font-semibold">{item.meaning}</div>
                {item.example && <div className="mt-2 text-sm italic text-slate-500">{item.example}</div>}
              </div>
              <p className="text-center text-xs text-slate-400">How well did you remember?</p>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { emoji: "😵", label: "Again", cls: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300" },
                  { emoji: "😓", label: "Hard", cls: "bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-300" },
                  { emoji: "🙂", label: "Good", cls: "grad text-white" },
                  { emoji: "😄", label: "Easy", cls: "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-300" },
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
            </>
          )}
        </div>
      )}
    </div>
  );
}
