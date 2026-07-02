from fastapi import FastAPI, APIRouter, HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import base64
import logging
import difflib
import re
import random
from pathlib import Path
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
import uuid
from datetime import datetime, timedelta, timezone

import jwt
from passlib.context import CryptContext

from groq import AsyncGroq


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

# MongoDB connection
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
JWT_SECRET = os.environ.get("JWT_SECRET_KEY", "dev-secret-change-me")
JWT_ALGO = os.environ.get("JWT_ALGORITHM", "HS256")
JWT_TTL_DAYS = 90

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer(auto_error=False)

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


# ---------- Auth ----------
class EmailRequest(BaseModel):
    email: EmailStr


class VerifyRequest(BaseModel):
    email: EmailStr
    code: str


class UserOut(BaseModel):
    id: str
    email: str
    created_at: str


class AuthResponse(BaseModel):
    token: str
    user: UserOut


def _create_token(user_id: str) -> str:
    exp = datetime.now(timezone.utc) + timedelta(days=JWT_TTL_DAYS)
    return jwt.encode({"sub": user_id, "exp": exp}, JWT_SECRET, algorithm=JWT_ALGO)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if credentials is None:
        raise HTTPException(status_code=401, detail="Missing credentials")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGO])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


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


@api_router.post("/auth/request-code")
async def request_code(payload: EmailRequest):
    email = payload.email.lower().strip()
    code = f"{random.randint(0, 999999):06d}"
    code_hash = pwd_context.hash(code)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=10)
    await db.otp_requests.update_one(
        {"email": email},
        {
            "$set": {
                "email": email,
                "code_hash": code_hash,
                "expires_at": expires_at.isoformat(),
                "attempts": 0,
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        },
        upsert=True,
    )
    logger.warning(f"[TalkTally OTP] {email} -> {code}")
    return {"message": "Code sent. Check backend logs (dev mode)."}


@api_router.post("/auth/verify-code", response_model=AuthResponse)
async def verify_code(payload: VerifyRequest):
    email = payload.email.lower().strip()
    code = (payload.code or "").strip()
    otp = await db.otp_requests.find_one({"email": email}, {"_id": 0})
    if not otp:
        raise HTTPException(status_code=400, detail="No code requested for this email")

    try:
        expires_at = datetime.fromisoformat(otp["expires_at"])
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)
    except Exception:
        expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)

    if datetime.now(timezone.utc) > expires_at:
        await db.otp_requests.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Code expired. Please request a new one.")

    if otp.get("attempts", 0) >= 5:
        await db.otp_requests.delete_one({"email": email})
        raise HTTPException(status_code=400, detail="Too many attempts. Please request a new code.")

    if not pwd_context.verify(code, otp["code_hash"]):
        await db.otp_requests.update_one({"email": email}, {"$inc": {"attempts": 1}})
        raise HTTPException(status_code=400, detail="Invalid code")

    await db.otp_requests.delete_one({"email": email})

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user:
        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "created_at": datetime.now(timezone.utc).isoformat(),
        }
        await db.users.insert_one(dict(user))

    token = _create_token(user["id"])
    return AuthResponse(token=token, user=UserOut(**user))


@api_router.get("/auth/me", response_model=UserOut)
async def me(user=Depends(get_current_user)):
    return UserOut(**user)


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
    ).sort("timestamp", -1).limit(100)
    return [SessionSummary(**doc) async for doc in cursor]


@api_router.get("/sessions/{session_id}", response_model=SessionDetail)
async def get_session(session_id: str):
    doc = await db.sessions.find_one({"id": session_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionDetail(**doc)


@api_router.post("/transcribe", response_model=TranscribeResponse)
async def transcribe(payload: TranscribeRequest):
    if not GROQ_API_KEY:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY missing")
    ext = payload.ext.lower().lstrip(".")
    if ext not in {"m4a", "mp4", "mp3", "wav", "webm", "mpeg", "mpga", "ogg", "flac"}:
        ext = "m4a"
    try:
        audio_bytes = base64.b64decode(payload.audio_base64)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid base64 audio: {e}")

    try:
        groq_client = AsyncGroq(api_key=GROQ_API_KEY)
        transcription = await groq_client.audio.transcriptions.create(
            file=(f"audio.{ext}", audio_bytes),
            model="whisper-large-v3-turbo",
            response_format="json",
            language="en",
        )
        transcript_text = getattr(transcription, "text", "") or ""
        score = _score_match(transcript_text, payload.target_word or "")
        correct = score >= 65
        return TranscribeResponse(transcript=transcript_text.strip(), match_score=score, correct=correct)
    except Exception as e:
        logger.exception("Transcription failed")
        raise HTTPException(status_code=500, detail=f"Transcription failed: {e}")


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
