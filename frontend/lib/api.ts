const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const APP_SECRET = process.env.NEXT_PUBLIC_APP_SECRET ?? "";

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(APP_SECRET ? { Authorization: `Bearer ${APP_SECRET}` } : {}),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body ? JSON.stringify(body) : undefined }),
  delete: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** TTS: returns an mp3 blob (not JSON). */
export async function fetchTTS(text: string, slow = false): Promise<Blob> {
  const res = await fetch(`${API_URL}/api/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(APP_SECRET ? { Authorization: `Bearer ${APP_SECRET}` } : {}),
    },
    body: JSON.stringify({ text, slow }),
  });
  if (!res.ok) throw new Error("TTS error");
  return res.blob();
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Profile {
  level: string;
  total_exercises: number;
  total_correct: number;
  streak: number;
  last_session: string;
  placement_done: boolean;
  weak_topics: Record<string, number>;
  badges: string[];
}

export interface Badge {
  name: string;
  earned: boolean;
}

export interface SrsItem {
  word: string;
  meaning: string;
  example: string;
  source: string;
  interval: number;
  ease: number;
  reps: number;
  next_review: string;
  added: string;
}

export interface SrsStats {
  total: number;
  due_today: number;
  learned: number;
  suspended: number;
}

export interface Exercise {
  id: number;
  type: string;
  question: string;
  options: string[] | null;
  hint: string;
  answer: string;
  topic: string;
  level: string;
}

export interface ExerciseResult {
  id: number;
  correct: boolean;
  user_answer: string;
  correct_answer: string;
  feedback: string;
  topic: string;
}

export interface TopicStat {
  status: string;
  average: number;
  last_score: number;
  attempt_count: number;
  last_practice: string;
  name?: string;
}

export interface Session {
  date: string;
  exercises: number;
  correct: number;
  accuracy: number;
}
