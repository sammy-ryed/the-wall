import os
import uuid
import logging
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional, Tuple

from fastapi import FastAPI, HTTPException, Query, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv

load_dotenv()

from models import (
    ConfessionIn, RoastOut,
    ConfessionPost, ConfessionSubmit,
    StatsOut, ConfessionsResponse,
    SessionRegister,
)
from roast import get_roast

logger = logging.getLogger(__name__)

app = FastAPI(
    title="The Wall API",
    description="Anonymous confession & roast machine — backend API.",
    version="3.0.0"
)

# ---------------------------------------------------------------------------
# CORS
# ---------------------------------------------------------------------------
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001,https://the-wall-fawn.vercel.app"
)
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Supabase admin client
# ---------------------------------------------------------------------------
_supabase_url = os.getenv("SUPABASE_URL", "")
_supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

_supabase = None
try:
    if _supabase_url and _supabase_service_key:
        from supabase import create_client
        _supabase = create_client(_supabase_url, _supabase_service_key)
        logger.info("Supabase client initialised — using persistent DB storage.")
    else:
        logger.warning("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY not set. Falling back to in-memory storage.")
except Exception as e:
    logger.warning(f"Supabase init failed: {e}. Falling back to in-memory storage.")

# ---------------------------------------------------------------------------
# JWT verification
# ---------------------------------------------------------------------------
security = HTTPBearer(auto_error=False)


def _verify_jwt(token: str) -> Optional[dict]:
    if not _supabase:
        return {"id": "dev-user", "email": "dev@localhost"}
    try:
        resp = _supabase.auth.get_user(token)
        if resp.user:
            return {"id": resp.user.id, "email": resp.user.email}
    except Exception as e:
        logger.warning(f"JWT verify failed: {e}")
    return None


def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> Optional[dict]:
    if not credentials:
        return None
    user = _verify_jwt(credentials.credentials)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    return user


def require_auth(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    user = verify_token(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user


# ---------------------------------------------------------------------------
# In-memory store — fallback when Supabase is not configured
# No seed data. Wall starts empty and fills with real confessions.
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


_confessions_memory: List[ConfessionPost] = []
_active_sessions: dict[str, str] = {}

# ---------------------------------------------------------------------------
# DB helpers
# ---------------------------------------------------------------------------

def _db_list(sort: str, page: int, per_page: int) -> Tuple[List[ConfessionPost], int]:
    """Read paginated confessions. Falls back to in-memory if no Supabase."""
    if not _supabase:
        if sort == "cringe":
            ordered = sorted(_confessions_memory, key=lambda c: c.cringe_score, reverse=True)
        else:
            ordered = list(_confessions_memory)
        total = len(ordered)
        start = (page - 1) * per_page
        return ordered[start:start + per_page], total

    try:
        order_col = "cringe_score" if sort == "cringe" else "created_at"
        start = (page - 1) * per_page
        end = start + per_page - 1
        result = (
            _supabase.table("confessions")
            .select("*", count="exact")
            .order(order_col, desc=True)
            .range(start, end)
            .execute()
        )
        items = [ConfessionPost.from_db_row(r) for r in result.data]
        return items, result.count or 0
    except Exception as e:
        logger.error(f"DB list failed: {e}")
        raise HTTPException(status_code=500, detail="Could not fetch confessions.")


def _db_leaderboard(limit: int) -> List[ConfessionPost]:
    if not _supabase:
        return sorted(_confessions_memory, key=lambda c: c.cringe_score, reverse=True)[:limit]
    try:
        result = (
            _supabase.table("confessions")
            .select("*")
            .order("cringe_score", desc=True)
            .limit(limit)
            .execute()
        )
        return [ConfessionPost.from_db_row(r) for r in result.data]
    except Exception as e:
        logger.error(f"DB leaderboard failed: {e}")
        return []


def _db_insert(payload: ConfessionSubmit) -> ConfessionPost:
    if not _supabase:
        entry = ConfessionPost(
            id=str(uuid.uuid4()),
            name=payload.name or "Anonymous",
            confession=payload.confession,
            cringe_score=payload.cringe_score,
            survival_probability=payload.survival_probability,
            roast=payload.roast,
            verdict=payload.verdict,
            era=payload.era,
            timestamp=_now_iso(),
            target_name=payload.target_name,
        )
        _confessions_memory.insert(0, entry)
        return entry

    try:
        insert_data = {
            "name": payload.name or "Anonymous",
            "confession": payload.confession,
            "cringe_score": payload.cringe_score,
            "survival_probability": payload.survival_probability,
            "roast": payload.roast,
            "verdict": payload.verdict,
            "era": payload.era,
            "target_name": payload.target_name,
        }
        result = _supabase.table("confessions").insert(insert_data).execute()
        return ConfessionPost.from_db_row(result.data[0])
    except Exception as e:
        logger.error(f"DB insert failed: {e}")
        raise HTTPException(status_code=500, detail="Could not save confession.")


def _db_stats() -> StatsOut:
    if not _supabase:
        items = _confessions_memory
    else:
        try:
            result = _supabase.table("confessions").select("cringe_score,survival_probability,era,name").execute()
            items_raw = result.data or []
            # Build lightweight objects for stats
            class _C:
                def __init__(self, r):
                    self.cringe_score = r["cringe_score"]
                    self.survival_probability = r["survival_probability"]
                    self.era = r["era"]
                    self.name = r["name"]
            items = [_C(r) for r in items_raw]
        except Exception as e:
            logger.error(f"DB stats failed: {e}")
            items = []

    total = len(items)
    if total == 0:
        return StatsOut(total_confessions=0, avg_cringe=0.0, lowest_survival=100, most_common_era="—", anon_percent=0.0)

    avg_cringe = round(sum(c.cringe_score for c in items) / total, 1)
    lowest_survival = min(c.survival_probability for c in items)
    most_common_era = Counter(c.era for c in items).most_common(1)[0][0]
    anon_count = sum(1 for c in items if c.name.strip().lower() in ("anonymous", "anonymous coward", "anon", ""))
    anon_percent = round((anon_count / total) * 100, 1)
    return StatsOut(total_confessions=total, avg_cringe=avg_cringe, lowest_survival=lowest_survival, most_common_era=most_common_era, anon_percent=anon_percent)


def _db_ticker() -> List[ConfessionPost]:
    if not _supabase:
        return _confessions_memory[:8]
    try:
        result = (
            _supabase.table("confessions")
            .select("name,cringe_score,verdict")
            .order("created_at", desc=True)
            .limit(8)
            .execute()
        )
        return result.data or []
    except Exception:
        return []

# ---------------------------------------------------------------------------
# Routes — Public
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.2.0", "db": "supabase" if _supabase else "memory"}


@app.get("/")
def root():
    return {"status": "online", "message": "The Wall API v2.2 — Groq roasts, Supabase storage."}


@app.get("/confessions", response_model=ConfessionsResponse)
def list_confessions(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="new", pattern="^(new|cringe)$"),
):
    items, total = _db_list(sort, page, per_page)
    return ConfessionsResponse(confessions=items, total=total, page=page, per_page=per_page)


@app.get("/confessions/leaderboard", response_model=list)
def leaderboard(limit: int = Query(default=3, ge=1, le=10)):
    items = _db_leaderboard(limit)
    return [c.model_dump() for c in items]


@app.get("/stats", response_model=StatsOut)
def get_stats():
    return _db_stats()


@app.get("/ticker")
def get_ticker():
    recent = _db_ticker()
    parts = []
    for c in recent:
        if isinstance(c, dict):
            name = c.get("name", "ANON").upper()
            score = c.get("cringe_score", 0)
            verdict = c.get("verdict", "???")
        else:
            name = c.name.upper()
            score = c.cringe_score
            verdict = c.verdict
        parts.append(f"{name} scored {score} cringe")
        parts.append(f"{name}: \"{verdict}\"")
    parts.append("YOUR CONFESSION IS NEXT")
    ticker_text = "    ///    ".join(parts)
    return {"text": f"    {ticker_text}    ///    {ticker_text}    "}

# ---------------------------------------------------------------------------
# Routes — Auth required
# ---------------------------------------------------------------------------

@app.post("/roast", response_model=RoastOut)
def roast_confession(
    payload: ConfessionIn,
    user: dict = Depends(require_auth),
):
    if not payload.confession or not payload.confession.strip():
        raise HTTPException(status_code=400, detail="Confession cannot be empty.")
    try:
        return get_roast(payload.confession)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roast engine failed: {str(e)}")


@app.post("/confessions", response_model=ConfessionPost, status_code=201)
def post_confession(
    payload: ConfessionSubmit,
    user: dict = Depends(require_auth),
):
    return _db_insert(payload)

# ---------------------------------------------------------------------------
# Routes — Single-session enforcement
# ---------------------------------------------------------------------------

@app.post("/auth/register-session")
def register_session(
    payload: SessionRegister,
    user: dict = Depends(require_auth),
):
    """
    Called immediately after login.
    Upserts the session token into Supabase active_sessions (or in-memory fallback).
    Any existing session for this user_id is overwritten — kicking out the old device.
    """
    if _supabase:
        try:
            _supabase.table("active_sessions").upsert({
                "user_id": user["id"],
                "session_token": payload.session_token,
                "updated_at": _now_iso(),
            }).execute()
        except Exception as e:
            logger.warning(f"Session DB upsert failed, falling back to memory: {e}")
            _active_sessions[user["id"]] = payload.session_token
    else:
        _active_sessions[user["id"]] = payload.session_token
    return {"status": "ok"}


@app.get("/auth/validate-session")
def validate_session(
    session_token: str = Query(...),
    user: dict = Depends(require_auth),
):
    """
    Called every 60s + on window focus by the frontend.
    Returns 200 if this session is still the active one, 401 if another device logged in.
    Persisted in Supabase so it survives backend restarts.
    """
    stored: Optional[str] = None

    if _supabase:
        try:
            result = (
                _supabase.table("active_sessions")
                .select("session_token")
                .eq("user_id", user["id"])
                .maybe_single()
                .execute()
            )
            if result.data:
                stored = result.data.get("session_token")
        except Exception as e:
            logger.warning(f"Session DB read failed, falling back to memory: {e}")
            stored = _active_sessions.get(user["id"])
    else:
        stored = _active_sessions.get(user["id"])

    if stored is None:
        # No session registered yet — grace period (first login after restart)
        return {"status": "valid"}
    if stored != session_token:
        raise HTTPException(
            status_code=401,
            detail="Session invalidated. Another device has signed in."
        )
    return {"status": "valid"}
