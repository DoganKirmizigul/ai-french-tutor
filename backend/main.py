"""My French Teacher — FastAPI backend."""
import os

from dotenv import load_dotenv

load_dotenv()

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from routers import chat, dictee, exercises, profile, srs, topics, tts

APP_SECRET = os.getenv("APP_SECRET", "")
CORS_ORIGINS = [o.strip() for o in os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")]

app = FastAPI(title="My French Teacher API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.middleware("http")
async def auth_middleware(request: Request, call_next):
    # Health check and CORS preflight bypass auth
    if request.url.path == "/health" or request.method == "OPTIONS":
        return await call_next(request)
    if APP_SECRET:
        auth = request.headers.get("Authorization", "")
        if auth != f"Bearer {APP_SECRET}":
            return JSONResponse({"detail": "Unauthorized"}, status_code=401)
    return await call_next(request)


@app.get("/health")
def health():
    return {"status": "ok"}


app.include_router(profile.router,   prefix="/api/profile",   tags=["profile"])
app.include_router(exercises.router, prefix="/api/exercises", tags=["exercises"])
app.include_router(topics.router,    prefix="/api/topics",    tags=["topics"])
app.include_router(srs.router,       prefix="/api/srs",       tags=["srs"])
app.include_router(dictee.router,    prefix="/api/dictee",    tags=["dictee"])
app.include_router(chat.router,      prefix="/api/chat",      tags=["chat"])
app.include_router(tts.router,       prefix="/api/tts",       tags=["tts"])
