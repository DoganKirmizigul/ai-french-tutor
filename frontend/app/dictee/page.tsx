"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { speak } from "@/lib/audio";
import { Headphones, Send, Volume2 } from "lucide-react";

interface DicteeResult {
  correct_words: number;
  wrong_words: number;
  errors: { wrong: string; correct: string; hint: string }[];
  score: number;
  feedback: string;
}

export default function DicteePage() {
  const [sentence, setSentence] = useState("");
  const [userInput, setUserInput] = useState("");
  const [result, setResult] = useState<DicteeResult | null>(null);
  const [loading, setLoading] = useState("");
  const [error, setError] = useState("");
  const [slow, setSlow] = useState(false);

  async function newSentence() {
    setLoading("gen");
    setError("");
    setResult(null);
    setUserInput("");
    try {
      const r = await api.post<{ sentence: string }>("/api/dictee/sentence");
      setSentence(r.sentence);
      await speak(r.sentence, slow);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  async function check() {
    setLoading("check");
    try {
      const r = await api.post<DicteeResult>("/api/dictee/check", {
        original: sentence, user_input: userInput,
      });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading("");
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">🎧 Dictée</h1>
      <p className="text-sm text-slate-500">Listen to the sentence and write it exactly. The best way to train your ear and spelling.</p>

      <div className="flex items-center gap-3">
        <button onClick={newSentence} disabled={loading === "gen"} className="btn-primary flex flex-1 items-center justify-center gap-2">
          <Headphones size={18} /> {loading === "gen" ? "Preparing…" : "New Sentence"}
        </button>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={slow} onChange={(e) => setSlow(e.target.checked)} />
          Slow
        </label>
      </div>

      {error && <div className="card border-red-300 text-sm text-red-600">{error}</div>}

      {sentence && (
        <>
          <button onClick={() => speak(sentence, slow)} className="btn-ghost flex w-full items-center justify-center gap-2">
            <Volume2 size={18} /> Listen Again
          </button>

          {!result && (
            <div className="card space-y-3">
              <textarea
                className="input min-h-24"
                placeholder="Write what you hear here…"
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
              />
              <button onClick={check} disabled={!userInput.trim() || loading === "check"} className="btn-primary flex w-full items-center justify-center gap-2">
                <Send size={16} /> {loading === "check" ? "Checking…" : "Check"}
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-3">
              <div className={`card text-center ${result.score >= 75 ? "border-green-400" : "border-orange-400"}`}>
                <div className="text-3xl font-bold">{result.score}%</div>
                <p className="mt-1 text-sm text-slate-500">
                  {result.correct_words} correct · {result.wrong_words} incorrect words
                </p>
                <p className="mt-2 text-sm">{result.feedback}</p>
              </div>

              <div className="card text-sm">
                <p className="mb-1 text-xs uppercase tracking-wide text-slate-400">Original</p>
                <p className="font-medium">{sentence}</p>
                <p className="mb-1 mt-3 text-xs uppercase tracking-wide text-slate-400">What you wrote</p>
                <p>{userInput}</p>
              </div>

              {result.errors?.length > 0 && (
                <div className="card space-y-2 text-sm">
                  {result.errors.map((e, i) => (
                    <p key={i}>❌ <del>{e.wrong}</del> → ✅ <strong>{e.correct}</strong> <span className="text-slate-400">— {e.hint}</span></p>
                  ))}
                </div>
              )}

              <button onClick={newSentence} className="btn-primary w-full">New Sentence</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
