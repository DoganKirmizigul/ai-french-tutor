"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { ArrowLeftRight, Copy, Check } from "lucide-react";

const LANGUAGES: Record<string, string> = {
  fr: "Français",
  tr: "Türkçe",
  en: "English",
};


export default function CeviriPage() {
  const [source, setSource] = useState("fr");
  const [target, setTarget] = useState("tr");
  const [input, setInput] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  async function translate(text: string) {
    const t = text.trim();
    if (!t) return;
    setLoading(true);
    setError("");
    setResult("");
    try {
      const r = await api.post<{ translated: string }>("/api/translate", {
        text: t, source, target,
      });
      setResult(r.translated);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }

  function swap() {
    setSource(target);
    setTarget(source);
    setInput(result);
    setResult(input);
  }

  function copy() {
    if (!result) return;
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">

      <div>
        <p className="eyebrow">Translation · MyMemory</p>
        <h1 className="page-title">Translate</h1>
        <p className="page-sub">Instantly translate French sentences.</p>
      </div>

      {/* Translator card */}
      <div className="card p-5 space-y-4">

        {/* Language selectors */}
        <div className="flex items-center gap-3">
          <select
            value={source}
            onChange={(e) => setSource(e.target.value)}
            className="input flex-1"
          >
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>

          <button
            onClick={swap}
            className="shrink-0 rounded-xl border border-border p-2 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            aria-label="Swap languages"
          >
            <ArrowLeftRight size={16} />
          </button>

          <select
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            className="input flex-1"
          >
            {Object.entries(LANGUAGES).map(([code, name]) => (
              <option key={code} value={code}>{name}</option>
            ))}
          </select>
        </div>

        {/* Input */}
        <div>
          <textarea
            className="input w-full min-h-[110px] resize-none"
            placeholder="Type the sentence you want to translate…"
            value={input}
            onChange={(e) => { setInput(e.target.value); setResult(""); }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) translate(input);
            }}
          />
          <p className="mt-1 text-right text-[10px] text-muted-foreground">{input.length}/1000</p>
        </div>

        <button
          onClick={() => translate(input)}
          disabled={!input.trim() || loading}
          className="btn-primary w-full flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              Translating…
            </>
          ) : "Translate"}
        </button>

        {error && (
          <p className="text-sm text-red-500">{error}</p>
        )}

        {/* Result */}
        {result && (
          <div className="relative rounded-xl border border-border bg-slate-50/60 dark:bg-slate-800/30 px-4 py-3">
            <p className="text-sm leading-relaxed pr-8">{result}</p>
            <button
              onClick={copy}
              className="absolute right-3 top-3 text-muted-foreground transition hover:text-foreground"
              aria-label="Copy translation"
            >
              {copied ? <Check size={15} className="text-green-500" /> : <Copy size={15} />}
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
