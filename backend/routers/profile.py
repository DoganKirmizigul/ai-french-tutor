from fastapi import APIRouter

import db

router = APIRouter()


@router.get("")
def get_profile():
    profile = db.read_profile()
    return {
        "profile": profile,
        "badges": db.get_all_badges(profile),
        "srs_stats": db.get_srs_stats(),
        "sessions": db.read_sessions(),
    }


@router.post("/touch")
def touch_profile():
    """Update streak on session open."""
    profile = db.read_profile()
    profile = db.update_streak(profile)
    new_badges = db.check_badges(profile)
    db.write_profile(profile)
    return {"profile": profile, "new_badges": new_badges}


@router.get("/error-log")
def get_error_log(limit: int = 50):
    return {"errors": db.read_error_log(limit)}
