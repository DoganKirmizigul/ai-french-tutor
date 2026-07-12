from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

import ai_engine as ai
import db

router = APIRouter()


class GenerateReq(BaseModel):
    adet: int = 3


class CheckReq(BaseModel):
    exercises: list
    answers: list


class PlacementEvalReq(BaseModel):
    questions: list
    answers: list


@router.post("/generate")
def generate(req: GenerateReq):
    profile = db.read_profile()
    try:
        exercises = ai.generate_exercises(
            profile["level"], profile["weak_topics"], db.error_log_text(), req.adet
        )
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")
    return {"exercises": exercises}


@router.post("/check")
def check(req: CheckReq):
    try:
        result = ai.check_answers(req.exercises, req.answers)
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")

    results = result.get("results", [])
    correct = sum(1 for r in results if r.get("correct"))
    total = len(results)

    profile = db.read_profile()
    profile = db.update_stats(profile, correct, total)
    wrong_results = [r for r in results if not r.get("correct")]
    profile = db.update_weak_topics(profile, [r.get("topic", "") for r in wrong_results])
    profile["_last_accuracy"] = round(correct / total * 100) if total else 0
    new_badges = db.check_badges(profile)
    db.write_profile(profile)
    db.add_session(correct, total)
    db.append_error_log([
        {
            "wrong": r.get("user_answer", ""),
            "correct": r.get("correct_answer", ""),
            "topic": r.get("topic", ""),
            "reason": r.get("feedback", ""),
        }
        for r in wrong_results
    ])
    return {"results": results, "correct": correct, "total": total, "new_badges": new_badges}


@router.get("/placement")
def placement_questions():
    try:
        return {"questions": ai.generate_placement_test()}
    except Exception as e:
        raise HTTPException(502, f"AI error: {e}")


@router.post("/placement/evaluate")
def placement_evaluate(req: PlacementEvalReq):
    result = ai.evaluate_placement(req.questions, req.answers)
    profile = db.read_profile()
    profile["level"] = result["level"]
    profile["placement_done"] = True
    db.write_profile(profile)
    return result
