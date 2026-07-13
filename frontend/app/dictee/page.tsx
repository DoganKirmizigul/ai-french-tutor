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

      {/* Header */}
      <div>
        <p className="eyebrow">Listening · Spelling</p>
        <h1 className="page-title">Dictée</h1>
        <p className="page-sub">Listen to the sentence and write it exactly. Train your ear and spelling.</p>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={newSentence}
          disabled={loading === "gen"}
          className="btn-primary flex-1 flex items-center justify-center gap-2"
        >
          <Headphones size={16} />
          {loading === "gen" ? "Preparing…" : "New Sentence"}
        </button>
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={slow}
            onChange={(e) => setSlow(e.target.checked)}
            className="accent-violet-700"
          />
          Slow
        </label>
      </div>

      {error && (
        <div className="card p-4 text-sm text-red-600 border-red-200 dark:border-red-900/50 dark:text-red-400">{error}</div>
      )}

      {sentence && (
        <>
          {/* Listen again */}
          <button
            onClick={() => speak(sentence, slow)}
            className="w-full flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium text-muted-foreground hover:border-violet-600/40 hover:text-foreground transition"
          >
            <Volume2 size={16} /> Listen Again
          </button>

          {!result && (
            <div className="card p-5 space-y-4">
              <div>
                <p className="eyebrow mb-2">Write what you hear</p>
                <textarea
                  className="input min-h-[96px] resize-none"
                  placeholder="Write the sentence here…"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                />
              </div>
              <button
                onClick={check}
                disabled={!userInput.trim() || loading === "check"}
                className="btn-primary w-full flex items-center justify-center gap-2"
              >
                <Send size={15} />
                {loading === "check" ? "Checking…" : "Check"}
              </button>
            </div>
          )}

          {result && (
            <div className="space-y-4">
              {/* Score */}
              <div className={`card p-6 text-center space-y-2 ${result.score >= 75 ? "border-green-400 dark:border-green-700" : "border-amber-400 dark:border-amber-700"}`}>
                <div className="text-5xl font-black tracking-tight">{result.score}%</div>
                <p className="text-sm text-muted-foreground">
                  {result.correct_words} correct · {result.wrong_words} incorrect words
                </p>
                <p className="text-sm">{result.feedback}</p>
              </div>

              {/* Comparison */}
              <div className="card p-5 space-y-4 text-sm">
                <div>
                  <p className="eyebrow mb-1.5">Original</p>
                  <p className="font-medium leading-relaxed">{sentence}</p>
                </div>
                <div className="h-px bg-border" />
                <div>
                  <p className="eyebrow mb-1.5">What you wrote</p>
                  <p className="leading-relaxed">{userInput}</p>
                </div>
              </div>

              {/* Errors */}
              {result.errors?.length > 0 && (
                <div className="card p-5 space-y-2 text-sm">
                  <p className="eyebrow mb-2">Corrections</p>
                  {result.errors.map((e, i) => (
                    <p key={i}>
                      <del className="text-red-500">{e.wrong}</del>
                      {" → "}
                      <strong className="text-green-600 dark:text-green-400">{e.correct}</strong>
                      {" "}
                      <span className="text-muted-foreground">— {e.hint}</span>
                    </p>
                  ))}
                </div>
              )}

              <button onClick={newSentence} className="btn-primary w-full">
                New Sentence
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
