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
      <h1 className="text-2xl font-bold">🔊 Pronunciation Lab</h1>
      <p className="text-sm text-slate-500">Type any French text, listen to it, and improve your pronunciation.</p>

      <div className="card space-y-4">
        <textarea
          className="input min-h-28"
          placeholder="Bonjour! Comment allez-vous? Je m'appelle Marie."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={!slow} onChange={() => setSlow(false)} /> Normal
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="radio" checked={slow} onChange={() => setSlow(true)} /> Slow
          </label>
        </div>
        <button
          onClick={() => play(text)}
          disabled={!text.trim() || loading}
          className="btn-primary flex w-full items-center justify-center gap-2"
        >
          <Volume2 size={18} /> {loading ? "Generating audio…" : "Listen"}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
      </div>

      <div>
        <h2 className="mb-3 font-semibold">Quick Examples</h2>
        <div className="grid gap-2 md:grid-cols-2">
          {Object.entries(EXAMPLES).map(([title, sentence]) => (
            <button
              key={title}
              onClick={() => { setText(sentence); play(sentence); }}
              className="card text-left transition hover:border-indigo-300"
            >
              <div className="font-medium">{title}</div>
              <div className="mt-1 text-xs text-slate-400">{sentence}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
