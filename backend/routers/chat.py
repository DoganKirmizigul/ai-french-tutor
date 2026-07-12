from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional

import ai_engine as ai
import db

router = APIRouter()


class ChatReq(BaseModel):
    messages: list
    session_id: Optional[int] = None


@router.post("")
def chat(req: ChatReq):
    try:
        reply = ai.chat(req.messages)
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")

    all_messages = req.messages + [{"role": "assistant", "content": reply}]

    if req.session_id:
        db.update_chat_session(req.session_id, all_messages)
        session_id = req.session_id
    else:
        first_user = next((m["content"] for m in req.messages if m["role"] == "user"), "Chat")
        title = first_user[:60] + ("…" if len(first_user) > 60 else "")
        session_id = db.create_chat_session(title, all_messages)

    return {"reply": reply, "session_id": session_id}


# ── Session management ────────────────────────────────────────────────────────

@router.get("/sessions")
def list_sessions():
    return {"sessions": db.list_chat_sessions()}


@router.get("/sessions/{session_id}")
def get_session(session_id: int):
    s = db.get_chat_session(session_id)
    if not s:
        raise HTTPException(404, "Session not found")
    return s


@router.delete("/sessions/{session_id}")
def delete_session(session_id: int):
    db.delete_chat_session(session_id)
    return {"ok": True}


# ── Word of day ───────────────────────────────────────────────────────────────

class WordOfDayReq(BaseModel):
    known_words: list = []


@router.post("/word-of-day")
def word_of_day(req: WordOfDayReq):
    profile = db.read_profile()
    try:
        return {"word": ai.generate_word_of_day(profile["level"], req.known_words)}
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
