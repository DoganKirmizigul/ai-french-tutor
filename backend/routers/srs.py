from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import ai_engine as ai
import db

router = APIRouter()


class AddReq(BaseModel):
    word: str
    meaning: str
    example: str = ""


class AnswerReq(BaseModel):
    word: str
    score: int  # 0=Again, 1=Hard, 2=Good, 3=Easy


class SuggestReq(BaseModel):
    mode: str = "progress"  # progress | frequency
    count: int = 10


@router.get("/due")
def due(all: bool = False):
    return {"due": db.get_due_srs_items(all_cards=all), "stats": db.get_srs_stats()}


@router.get("/all")
def all_items():
    return {"items": db.read_srs(), "stats": db.get_srs_stats()}


@router.post("/add")
def add(req: AddReq):
    ok = db.add_srs_item(req.word.strip(), req.meaning.strip(), req.example.strip())
    return {"added": ok}


@router.post("/answer")
def answer(req: AnswerReq):
    if req.score not in (0, 1, 2, 3):
        raise HTTPException(400, "score must be 0-3")
    db.update_srs_item(req.word, req.score)
    return {"ok": True}


class SuspendReq(BaseModel):
    word: str
    suspended: bool = True


@router.post("/suspend")
def suspend(req: SuspendReq):
    db.suspend_srs_item(req.word, req.suspended)
    return {"ok": True}


@router.post("/suggest")
def suggest(req: SuggestReq):
    profile = db.read_profile()
    known = [i["word"] for i in db.read_srs()]
    try:
        suggestions = ai.suggest_words(
            profile["level"],
            profile["weak_topics"] if req.mode == "progress" else {},
            known, mode=req.mode, count=req.count,
        )
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
    for s in suggestions:
        s["source"] = req.mode
    added_count = db.bulk_add_srs_items(suggestions)
    return {"suggestions": suggestions, "added_count": added_count}
