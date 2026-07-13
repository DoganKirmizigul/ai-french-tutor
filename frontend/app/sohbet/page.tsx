"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api } from "@/lib/api";
import { Send, Plus, Trash2, MessageSquare, History, X } from "lucide-react";

interface Msg {
  role: "user" | "assistant";
  content: string;
}

interface Session {
  id: number;
  title: string;
  created: string;
  updated: string;
}

const QUICK_QUESTIONS = [
  "What is the difference between passé composé and imparfait?",
  "How are the pronouns 'en' and 'y' used?",
  "Does French have suffixes like Turkish?",
  "Write me a short story at A1 level",
];

export default function SohbetPage() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const loadSessions = useCallback(async () => {
    try {
      const r = await api.get<{ sessions: Session[] }>("/api/chat/sessions");
      setSessions(r.sessions);
    } catch {}
  }, []);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function openSession(id: number) {
    try {
      const s = await api.get<{ id: number; messages: Msg[] }>(`/api/chat/sessions/${id}`);
      setActiveId(s.id);
      setMessages(s.messages);
      setDrawerOpen(false);
    } catch {}
  }

  function newChat() {
    setActiveId(null);
    setMessages([]);
    setInput("");
  }

  async function deleteSession(id: number, e: React.MouseEvent) {
    e.stopPropagation();
    await api.delete(`/api/chat/sessions/${id}`);
    if (activeId === id) newChat();
    setSessions((prev) => prev.filter((s) => s.id !== id));
  }

  async function send(text: string) {
    const t = text.trim();
    if (!t || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: t }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const r = await api.post<{ reply: string; session_id: number }>("/api/chat", {
        messages: next,
        session_id: activeId,
      });
      setMessages([...next, { role: "assistant", content: r.reply }]);
      if (!activeId) {
        setActiveId(r.session_id);
        loadSessions();
      }
    } catch (e) {
      setMessages([...next, { role: "assistant", content: `⚠️ Error: ${(e as Error).message}` }]);
    } finally {
      setLoading(false);
    }
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  }

  const SessionList = () => (
    <>
      <button onClick={newChat} className="btn-primary w-full flex items-center justify-center gap-1.5 text-sm">
        <Plus size={14} /> New Chat
      </button>
      <div className="flex-1 overflow-y-auto space-y-0.5 mt-2">
        {sessions.length === 0 && (
          <p className="px-2 py-2 text-xs text-muted-foreground">No conversations yet</p>
        )}
        {sessions.map((s) => (
          <button
            key={s.id}
            onClick={() => openSession(s.id)}
            className={`group flex w-full items-start gap-2 rounded-xl px-3 py-2.5 text-left text-xs transition ${
              activeId === s.id
                ? "bg-slate-700/10 text-slate-700 dark:text-slate-400"
                : "hover:bg-muted"
            }`}
          >
            <MessageSquare size={12} className="mt-0.5 shrink-0 opacity-40" />
            <span className="flex-1 min-w-0">
              <span className="block truncate font-semibold">{s.title}</span>
              <span className="text-muted-foreground">{formatDate(s.updated)}</span>
            </span>
            <Trash2
              size={12}
              onClick={(e) => deleteSession(s.id, e)}
              className="mt-0.5 shrink-0 opacity-0 group-hover:opacity-40 hover:!opacity-100 text-red-500 transition"
            />
          </button>
        ))}
      </div>
    </>
  );

  return (
    <div className="flex h-[calc(100dvh-120px)] gap-4">

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDrawerOpen(false)} />
          <div className="relative flex w-72 max-w-[85vw] flex-col gap-2 bg-background p-4 shadow-2xl border-r border-border">
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-sm">Chat History</span>
              <button onClick={() => setDrawerOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X size={18} />
              </button>
            </div>
            <SessionList />
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="hidden w-56 shrink-0 flex-col gap-2 md:flex">
        <SessionList />
      </aside>

      {/* Chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="eyebrow">AI · Conversational</p>
            <h1 className="text-xl font-black tracking-tight mt-0.5">Ask Your Teacher</h1>
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className="flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-medium text-muted-foreground hover:text-foreground transition md:hidden"
          >
            <History size={14} /> History
          </button>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto pb-4">
          {messages.length === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Ask anything about French:</p>
              {QUICK_QUESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => send(s)}
                  className="card w-full p-3.5 text-left text-sm transition hover:border-slate-600/40 hover:shadow-md"
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              {m.role === "user" ? (
                <div
                  className="max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-2.5 text-sm text-white"
                  style={{
                    background: "radial-gradient(ellipse at 25% 20%, rgba(255,255,255,0.18), transparent 55%), linear-gradient(148deg, hsl(273 66% 50%) 0%, hsl(273 72% 35%) 100%)",
                    boxShadow: "0 4px 14px hsl(273 72% 38% / 0.35)",
                  }}
                >
                  {m.content}
                </div>
              ) : (
                <div className="card prose-chat max-w-[85%] rounded-2xl px-4 py-2.5 text-sm">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-3 w-3 animate-spin rounded-full border-2 border-slate-700 border-t-transparent" />
              Teacher is typing…
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => { e.preventDefault(); send(input); }}
          className="flex gap-2 border-t border-border pt-3"
        >
          <input
            className="input flex-1 min-w-0"
            placeholder="Type your question…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
          <button
            type="submit"
            disabled={!input.trim() || loading}
            className="btn-primary flex items-center justify-center gap-1 shrink-0 px-4"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </div>
  );
}
