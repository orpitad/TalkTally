from fastapi import FastAPI, APIRouter, HTTPException
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import tempfile
import logging
import difflib
import re
from pathlib import Path
from pydantic import BaseModel, Field
from typing import List, Optional
import uuid
from datetime import datetime, timezone

from emergentintegrations.llm.openai.speech_to_text import OpenAISpeechToText


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

EMERGENT_LLM_KEY = os.environ.get("EMERGENT_LLM_KEY")

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

app = FastAPI()
api_router = APIRouter(prefix="/api")


# ---------- Models ----------
class ProfileCreate(BaseModel):
    name: str
    age_cohort: str  # "12-18M" | "18-24M" | "24-30M" | "30-36M"


class Profile(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    age_cohort: str
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())


class SessionTarget(BaseModel):
    word: str
    target_phoneme: str
    correct: bool
    transcript: Optional[str] = ""
    audio_base64: Optional[str] = ""
    audio_ext: Optional[str] = "m4a"


class SessionCreate(BaseModel):
    profile_id: str
    category_id: str
    category_label: str
    targets: List[SessionTarget]


class SessionSummary(BaseModel):
    id: str
    profile_id: str
    category_id: str
    category_label: str
    accuracy: int
    correct_count: int
    total_count: int
    timestamp: str
    target_words: List[str]


class SessionDetail(SessionSummary):
    targets: List[SessionTarget]


class TranscribeRequest(BaseModel):
    audio_base64: str
    ext: str = "m4a"  # m4a | mp4 | wav | webm | mp3
    target_word: Optional[str] = None


class TranscribeResponse(BaseModel):
    transcript: str
    match_score: int  # 0-100
    correct: bool


# ---------- Utilities ----------
def _normalize(text: str) -> str:
    return re.sub(r"[^a-z]", "", (text or "").lower())


def _score_match(transcript: str, target: str) -> int:
    a, b = _normalize(transcript), _normalize(target)
    if not b:
        return 0
    if not a:
        return 0
    if a == b:
        return 100
    if b in a or a in b:
        return 95
    ratio = difflib.SequenceMatcher(None, a, b).ratio()
    return int(round(ratio * 100))


# ---------- Routes ----------
@api_router.get("/")
async def root():
    return {"message": "TalkTally API", "status": "ok"}


@api_router.post("/profiles", response_model=Profile)
async def create_profile(payload: ProfileCreate):
    profile = Profile(name=payload.name.strip() or "Child", age_cohort=payload.age_cohort)
    await db.profiles.insert_one(profile.model_dump())
    return profile


@api_router.get("/profiles/{profile_id}", response_model=Profile)
async def get_profile(profile_id: str):
    doc = await db.profiles.find_one({"id": profile_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Profile not found")
    return Profile(**doc)


@api_router.post("/sessions", response_model=SessionSummary)
async def create_session(payload: SessionCreate):
    correct_count = sum(1 for t in payload.targets if t.correct)
    total = len(payload.targets) or 1
    accuracy = int(round((correct_count / total) * 100))
    session_id = str(uuid.uuid4())
    ts = datetime.now(timezone.utc).isoformat()

    doc = {
        "id": session_id,
        "profile_id": payload.profile_id,
        "category_id": payload.category_id,
        "category_label": payload.category_label,
        "accuracy": accuracy,
        "correct_count": correct_count,
        "total_count": len(payload.targets),
        "timestamp": ts,
        "target_words": [t.word for t in payload.targets],
        "targets": [t.model_dump() for t in payload.targets],
    }
    await db.sessions.insert_one(doc)
    return SessionSummary(
        id=session_id,
        profile_id=payload.profile_id,
        category_id=payload.category_id,
        category_label=payload.category_label,
        accuracy=accuracy,
        correct_count=correct_count,
        total_count=len(payload.targets),
        timestamp=ts,
        target_words=[t.word for t in payload.targets],
    )


@api_router.get("/sessions", response_model=List[SessionSummary])
async def list_sessions(profile_id: str):
    cursor = db.sessions.find(
        {"profile_id": profile_id},
        {"_id": 0, "targets": 0},
    ).sort("timestamp", -1)
    return [SessionSummary(**doc) async for doc in cursor]


@api_router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionDetail(**doc)


@api_router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(payload: TranscribeRequest):
    if not EMERGENT_LLM_KEY:
        raise HTTPException(status_code=500, detail="EMERGENT_LLM_KEY missing")
    ext = payload.ext.lower().lstrip(".")
    if ext not in {"m4a", "mp4", "mp3", "wav", "webm", "mpeg", "mpga"}:
        ext = "m4a"
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {e}")

    tmp_path = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{ext}") as tmp:
            tmp.write(audio_bytes)
            tmp_path = tmp.name
        stt = OpenAISpeechToText(api_key=EMERGENT_LLM_KEY)
        response = await stt.transcribe(file=tmp_path, model="whisper-1", response_format="json", language="en")
        # response is a dict-like from litellm
        transcript_text = ""
        if isinstance(response, dict):
            transcript_text = response.get("text", "") or ""
        else:
            transcript_text = getattr(response, "text", "") or str(response)
        score = _score_match(transcript_text, payload.target_word or "")
        correct = score >= 65
        return TranscribeResponse(transcript=transcript_text.strip(), match_score=score, correct=correct)
    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")
    finally:
        if tmp_path and os.path.exists(tmp_path):
            try:
                os.remove(tmp_path)
            except Exception:
                pass


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
