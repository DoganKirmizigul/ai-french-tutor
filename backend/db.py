"""SQLite layer — port of file_manager.py.

Schema: profile (single row), srs_items, sessions, topic_attempts, error_log.
SM-2/Anki algorithm and badge criteria ported from the Streamlit version.
"""
import json
import os
import sqlite3
from datetime import date, datetime, timedelta
from pathlib import Path

DB_PATH = Path(os.getenv("DB_PATH", "data/app.db"))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS profile (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    level TEXT DEFAULT 'A1',
    total_exercises INTEGER DEFAULT 0,
    total_correct INTEGER DEFAULT 0,
    streak INTEGER DEFAULT 0,
    last_session TEXT DEFAULT '',
    placement_done INTEGER DEFAULT 0,
    weak_topics TEXT DEFAULT '{}',
    badges TEXT DEFAULT '[]'
);
CREATE TABLE IF NOT EXISTS srs_items (
    word TEXT PRIMARY KEY COLLATE NOCASE,
    meaning TEXT NOT NULL,
    example TEXT DEFAULT '',
    source TEXT DEFAULT 'manual',
    interval INTEGER DEFAULT 1,
    ease REAL DEFAULT 2.5,
    reps INTEGER DEFAULT 0,
    next_review TEXT NOT NULL,
    added TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    exercises INTEGER NOT NULL,
    correct INTEGER NOT NULL,
    accuracy REAL NOT NULL
);
CREATE TABLE IF NOT EXISTS topic_attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    topic_id TEXT NOT NULL,
    topic_name TEXT DEFAULT '',
    date TEXT NOT NULL,
    correct INTEGER NOT NULL,
    total INTEGER NOT NULL,
    score INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS error_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL,
    wrong TEXT DEFAULT '',
    correct TEXT DEFAULT '',
    topic TEXT DEFAULT '',
    reason TEXT DEFAULT ''
);
"""


def get_conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.executescript(_SCHEMA)
    conn.execute("INSERT OR IGNORE INTO profile (id) VALUES (1)")
    conn.commit()
    return conn


# ── Profile ───────────────────────────────────────────────────────────────────

def read_profile() -> dict:
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM profile WHERE id = 1").fetchone()
    p = dict(row)
    p["placement_done"] = bool(p["placement_done"])
    p["weak_topics"] = json.loads(p["weak_topics"])
    p["badges"] = json.loads(p["badges"])
    del p["id"]
    return p


def write_profile(p: dict):
    with get_conn() as conn:
        conn.execute(
            """UPDATE profile SET level=?, total_exercises=?, total_correct=?, streak=?,
               last_session=?, placement_done=?, weak_topics=?, badges=? WHERE id=1""",
            (
                p.get("level", "A1"),
                p.get("total_exercises", 0),
                p.get("total_correct", 0),
                p.get("streak", 0),
                p.get("last_session", ""),
                int(p.get("placement_done", False)),
                json.dumps(p.get("weak_topics", {}), ensure_ascii=False),
                json.dumps(p.get("badges", []), ensure_ascii=False),
            ),
        )
        conn.commit()


def update_streak(profile: dict) -> dict:
    today = date.today().isoformat()
    last = profile.get("last_session", "")
    yesterday = (date.today() - timedelta(days=1)).isoformat()
    if last == today:
        pass
    elif last == yesterday:
        profile["streak"] = profile.get("streak", 0) + 1
    else:
        profile["streak"] = 1
    profile["last_session"] = today
    return profile


def update_stats(profile: dict, correct: int, total: int) -> dict:
    profile["total_exercises"] = profile.get("total_exercises", 0) + total
    profile["total_correct"] = profile.get("total_correct", 0) + correct
    return profile


def update_weak_topics(profile: dict, wrong_topics: list) -> dict:
    wt = profile.get("weak_topics", {})
    for topic in wrong_topics:
        if topic:
            wt[topic] = wt.get(topic, 0) + 1
    profile["weak_topics"] = wt
    return profile


# ── Badge system ──────────────────────────────────────────────────────────────

_BADGES = {
    "first_step": {"name": "First Step 🎯",     "check": lambda p: p["total_exercises"] >= 1},
    "streak_3":   {"name": "3-Day Streak 🔥",   "check": lambda p: p["streak"] >= 3},
    "streak_7":   {"name": "One Week! 🔥🔥",    "check": lambda p: p["streak"] >= 7},
    "streak_30":  {"name": "One Month! 🏆",     "check": lambda p: p["streak"] >= 30},
    "pro_50":     {"name": "50 Exercises 💪",   "check": lambda p: p["total_exercises"] >= 50},
    "pro_200":    {"name": "200 Exercises 🧠",  "check": lambda p: p["total_exercises"] >= 200},
    "perfect":    {"name": "Perfectionist ⭐",  "check": lambda p: p.get("_last_accuracy", 0) == 100},
}


def check_badges(profile: dict) -> list:
    earned = set(profile.get("badges", []))
    new_badges = []
    for key, badge in _BADGES.items():
        if key not in earned and badge["check"](profile):
            profile.setdefault("badges", []).append(key)
            new_badges.append(badge["name"])
    return new_badges


def get_all_badges(profile: dict) -> list:
    earned = set(profile.get("badges", []))
    return [{"name": b["name"], "earned": k in earned} for k, b in _BADGES.items()]


# ── Error log ─────────────────────────────────────────────────────────────────

def append_error_log(errors: list):
    if not errors:
        return
    now = datetime.now().isoformat(timespec="minutes")
    with get_conn() as conn:
        conn.executemany(
            "INSERT INTO error_log (date, wrong, correct, topic, reason) VALUES (?,?,?,?,?)",
            [
                (now, e.get("wrong", "?"), e.get("correct", "?"), e.get("topic", "-"), e.get("reason", "-"))
                for e in errors
            ],
        )
        conn.commit()


def read_error_log(limit: int = 50) -> list:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM error_log ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()
    return [dict(r) for r in rows]


def error_log_text(limit: int = 30) -> str:
    """Return recent errors as plain text for AI prompts."""
    rows = read_error_log(limit)
    lines = []
    for r in rows:
        lines.append(f"- Wrong: {r['wrong']} | Correct: {r['correct']} | Topic: {r['topic']}")
    return "\n".join(lines)


# ── Session history ───────────────────────────────────────────────────────────

def add_session(correct: int, total: int):
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO sessions (date, exercises, correct, accuracy) VALUES (?,?,?,?)",
            (date.today().isoformat(), total, correct, round(correct / total * 100, 1) if total else 0),
        )
        conn.commit()


def read_sessions() -> list:
    with get_conn() as conn:
        rows = conn.execute("SELECT date, exercises, correct, accuracy FROM sessions ORDER BY id").fetchall()
    return [dict(r) for r in rows]


# ── SRS (Spaced Repetition) ───────────────────────────────────────────────────

def read_srs() -> list:
    with get_conn() as conn:
        rows = conn.execute("SELECT * FROM srs_items ORDER BY next_review").fetchall()
    return [dict(r) for r in rows]


def add_srs_item(word: str, meaning: str, example: str = "", source: str = "manual") -> bool:
    today = date.today().isoformat()
    with get_conn() as conn:
        try:
            conn.execute(
                "INSERT INTO srs_items (word, meaning, example, source, next_review, added) VALUES (?,?,?,?,?,?)",
                (word, meaning, example, source, today, today),
            )
            conn.commit()
            return True
        except sqlite3.IntegrityError:
            return False


def bulk_add_srs_items(words: list) -> int:
    added = 0
    for w in words:
        if add_srs_item(w["word"], w["meaning"], w.get("example", ""), w.get("source", "ai")):
            added += 1
    return added


def get_due_srs_items() -> list:
    today = date.today().isoformat()
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT * FROM srs_items WHERE next_review <= ? ORDER BY next_review", (today,)
        ).fetchall()
    return [dict(r) for r in rows]


# Anki-style 4 buttons: Again=0 / Hard=1 / Good=2 / Easy=3
_ANKI_EASE_DELTA   = {0: -0.20, 1: -0.10, 2: 0.0,  3: 0.15}
_ANKI_INTERVAL_MUL = {0:  0.0,  1:  1.0,  2: 1.0,  3: 1.3}


def update_srs_item(word: str, score: int):
    """Anki-style update. score: 0=Again, 1=Hard, 2=Good, 3=Easy."""
    with get_conn() as conn:
        row = conn.execute("SELECT * FROM srs_items WHERE word = ?", (word,)).fetchone()
        if not row:
            return
        item = dict(row)
        item["ease"] = max(1.3, item["ease"] + _ANKI_EASE_DELTA[score])
        if score == 0:
            item["reps"] = 0
            item["interval"] = 1
        else:
            item["reps"] += 1
            item["interval"] = int(max(1, item["interval"] * item["ease"] * _ANKI_INTERVAL_MUL[score]))
        days = item["interval"] if score > 0 else 1
        next_review = (date.today() + timedelta(days=days)).isoformat()
        conn.execute(
            "UPDATE srs_items SET ease=?, reps=?, interval=?, next_review=? WHERE word=?",
            (item["ease"], item["reps"], item["interval"], next_review, word),
        )
        conn.commit()


def get_srs_stats() -> dict:
    today = date.today().isoformat()
    with get_conn() as conn:
        total = conn.execute("SELECT COUNT(*) FROM srs_items").fetchone()[0]
        due_today = conn.execute(
            "SELECT COUNT(*) FROM srs_items WHERE next_review <= ?", (today,)
        ).fetchone()[0]
        learned = conn.execute("SELECT COUNT(*) FROM srs_items WHERE reps >= 3").fetchone()[0]
    return {"total": total, "due_today": due_today, "learned": learned}


# ── Topic progress ────────────────────────────────────────────────────────────

def update_topic_score(topic_id: str, topic_name: str, correct: int, total: int) -> int:
    score = round(correct / total * 100) if total else 0
    with get_conn() as conn:
        conn.execute(
            "INSERT INTO topic_attempts (topic_id, topic_name, date, correct, total, score) VALUES (?,?,?,?,?,?)",
            (topic_id, topic_name, date.today().isoformat(), correct, total, score),
        )
        conn.commit()
    return score


def _get_status(average: int) -> str:
    if average >= 90:
        return "mastered"
    if average >= 75:
        return "good"
    if average >= 50:
        return "improving"
    return "weak"


def get_topic_stat(topic_id: str) -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT score, date FROM topic_attempts WHERE topic_id = ? ORDER BY id", (topic_id,)
        ).fetchall()
    if not rows:
        return {"status": "not_started", "average": 0, "last_score": 0, "attempt_count": 0, "last_practice": ""}
    scores = [r["score"] for r in rows]
    average = round(sum(scores) / len(scores))
    return {
        "status": _get_status(average),
        "average": average,
        "last_score": scores[-1],
        "attempt_count": len(scores),
        "last_practice": rows[-1]["date"],
    }


def get_all_topic_stats() -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            "SELECT DISTINCT topic_id, topic_name FROM topic_attempts"
        ).fetchall()
    return {
        r["topic_id"]: {"name": r["topic_name"], **get_topic_stat(r["topic_id"])}
        for r in rows
    }
