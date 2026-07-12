import io

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from gtts import gTTS
from pydantic import BaseModel

router = APIRouter()


class TTSReq(BaseModel):
    text: str
    slow: bool = False


@router.post("")
def tts(req: TTSReq):
    text = req.text.strip()
    if not text:
        raise HTTPException(400, "text cannot be empty")
    if len(text) > 500:
        raise HTTPException(400, "text must be under 500 characters")
    buf = io.BytesIO()
    try:
        gTTS(text=text, lang="fr", slow=req.slow).write_to_fp(buf)
    except Exception as e:
        raise HTTPException(502, f"TTS error: {e}")
    return Response(content=buf.getvalue(), media_type="audio/mpeg")
