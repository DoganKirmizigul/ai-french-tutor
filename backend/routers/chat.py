from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import ai_engine as ai

router = APIRouter()


class ChatReq(BaseModel):
    messages: list  # [{"role": "user"|"assistant", "content": "..."}]


@router.post("")
def chat(req: ChatReq):
    try:
        reply = ai.chat(req.messages)
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
    return {"reply": reply}


class WordOfDayReq(BaseModel):
    known_words: list = []


@router.post("/word-of-day")
def word_of_day(req: WordOfDayReq):
    import db
    profile = db.read_profile()
    try:
        return {"word": ai.generate_word_of_day(profile["level"], req.known_words)}
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
