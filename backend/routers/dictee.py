from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import ai_engine as ai
import db

router = APIRouter()


class CheckReq(BaseModel):
    original: str
    user_input: str


@router.post("/sentence")
def sentence():
    profile = db.read_profile()
    try:
        text = ai.generate_dictee_sentence(profile["level"])
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
    return {"sentence": text}


@router.post("/check")
def check(req: CheckReq):
    try:
        result = ai.check_dictee(req.original, req.user_input)
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
    # Log wrong words to error log
    db.append_error_log([
        {"wrong": e.get("wrong", ""), "correct": e.get("correct", ""), "topic": "dictée", "reason": e.get("hint", "")}
        for e in result.get("errors", [])
    ])
    return result
