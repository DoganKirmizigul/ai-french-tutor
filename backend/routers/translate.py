import os
import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

MYMEMORY_KEY = os.getenv("MYMEMORY_KEY", "")


class TranslateReq(BaseModel):
    text: str
    source: str = "fr"
    target: str = "tr"


@router.post("")
async def translate(req: TranslateReq):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "text cannot be empty")
    if len(text) > 1000:
        raise HTTPException(400, "text must be under 1000 characters")

    langpair = f"{req.source}|{req.target}"
    params: dict = {"q": text, "langpair": langpair}
    if MYMEMORY_KEY:
        params["key"] = MYMEMORY_KEY

    async with httpx.AsyncClient(timeout=10) as client:
        try:
            r = await client.get("https://api.mymemory.translated.net/get", params=params)
            r.raise_for_status()
            data = r.json()
        except Exception as e:
            raise HTTPException(502, f"Translation service error: {e}")

    translated = data.get("responseData", {}).get("translatedText", "")
    if not translated or translated.upper() == text.upper():
        raise HTTPException(502, "Translation failed")

    return {"translated": translated, "source": req.source, "target": req.target}
