"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { Send } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const QUICK_QUESTIONS = [
  "What is the difference between passé composé and imparfait?",
  "How are the pronouns 'en' and 'y' used?",
  "Does French have suffixes like Turkish?",
  "Write me a short story at A1 level",
];

export default function SohbetPage() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post<{ reply: string }>("/api/chat", { messages: next });
      setMessages([...next, { role: "assistant", content: r.reply }]);
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `⚠️ Error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex h-[calc(100dvh-180px)] flex-col md:h-[calc(100dvh-140px)]">
      <h1 className="mb-4 text-2xl font-bold">💬 Ask Your Teacher</h1>

      <div className="flex-1 space-y-3 overflow-y-auto pb-4">
        {messages.length === 0 && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">Ask anything about French:</p>
            {QUICK_QUESTIONS.map((s) => (
              <button key={s} onClick={() => send(s)} className="card block w-full text-left text-sm transition hover:border-indigo-300">
                {s}
              </button>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            {m.role === "user" ? (
              <div className="grad max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm text-white">
                {m.content}
              </div>
            ) : (
              <div className="card prose-chat max-w-[85%] rounded-2xl px-4 py-2.5 text-sm">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
              </div>
            )}
          </div>
        ))}
        {loading && <div className="animate-pulse text-sm text-slate-400">Teacher is typing…</div>}
        <div ref={bottomRef} />
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="flex gap-2 border-t border-slate-200 pt-3 dark:border-slate-800"
      >
        <input
          className="input flex-1"
          placeholder="Type your question…"
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
        <button type="submit" disabled={!input.trim() || loading} className="btn-primary flex items-center gap-1">
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
