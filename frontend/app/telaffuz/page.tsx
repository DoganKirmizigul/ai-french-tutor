"use client";

import { useState } from "react";
import { speak } from "@/lib/audio";
import { Volume2 } from "lucide-react";

const EXAMPLES: Record<string, string> = {
  Greetings: "Bonjour! Comment allez-vous? Ça va très bien, merci.",
  "Introducing Yourself": "Je m'appelle Marie. J'ai vingt-cinq ans et j'habite à Istanbul.",
  Shopping: "Combien ça coûte? C'est trop cher! Vous avez une taille plus grande?",
  "Ordering Food": "Je voudrais un café au lait et un croissant, s'il vous plaît.",
  "Passé Composé": "Hier, je suis allé au marché et j'ai acheté des fruits.",
};

export default function TelaffuzPage() {
  const [text, setText] = useState("");
  const [slow, setSlow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function play(t: string) {
    setLoading(true);
    setError("");
    try {
      await speak(t, slow);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">

      {/* Header */}
      <div>
        <p className="eyebrow">Audio · TTS</p>
        <h1 className="page-title">Pronunciation Lab</h1>
        <p className="page-sub">Type any French text, listen to it, and refine your pronunciation.</p>
      </div>

      {/* Input card */}
      <div className="card p-5 space-y-4">
        <div>
          <p className="eyebrow mb-2">French text</p>
          <textarea
            className="input min-h-[112px] resize-none"
            placeholder="Bonjour! Comment allez-vous? Je m'appelle Marie."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={!slow} onChange={() => setSlow(false)} className="accent-slate-700" />
            Normal speed
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="radio" checked={slow} onChange={() => setSlow(true)} className="accent-slate-700" />
            Slow speed
          </label>
        </div>

        <button
          onClick={() => play(text)}
          disabled={!text.trim() || loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          <Volume2 size={16} />
          {loading ? "Generating audio…" : "Listen"}
        </button>

        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      {/* Quick examples */}
      <div>
        <p className="eyebrow mb-3">Quick Examples</p>
        <div className="grid gap-2.5 md:grid-cols-2">
          {Object.entries(EXAMPLES).map(([title, sentence]) => (
            <button
              key={title}
              onClick={() => { setText(sentence); play(sentence); }}
              className="card p-4 text-left transition hover:border-slate-600/40 hover:shadow-md group"
            >
              <div className="font-semibold text-sm group-hover:text-slate-700 dark:group-hover:text-slate-400 transition">
                {title}
              </div>
              <div className="mt-1 text-xs text-muted-foreground line-clamp-2">{sentence}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
