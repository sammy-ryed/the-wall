import os
import uuid
import logging
from collections import Counter
from datetime import datetime, timezone, timedelta
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
    version="2.2.0"
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
# In-memory store — used as fallback when Supabase is not configured
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _seed_memory() -> List[ConfessionPost]:
    seeds_raw = [
        {"name": "Rahul", "confession": "I pushed to production on a Friday at 5pm and immediately went offline. Left the country.", "cringe_score": 97, "survival_probability": 4, "roast": "You didn't go on vacation. You fled the scene of a crime.", "verdict": "Chaos agent", "era": "Post-accountability arc", "target_name": None},
        {"name": "Priya", "confession": "I've been saying 'I'll refactor this later' for 3 years. It's still there. It powers billing.", "cringe_score": 61, "survival_probability": 71, "roast": "Technical debt is just emotional debt in a trench coat.", "verdict": "Relatable villain", "era": "Legacy code era", "target_name": None},
        {"name": "Arjun", "confession": "I ghosted a recruiter from Google because I panicked during the Zoom call. Never rescheduled.", "cringe_score": 78, "survival_probability": 55, "roast": "You dodged Google and hit yourself in the face on the way out.", "verdict": "Self-saboteur", "era": "Late NPC arc", "target_name": None},
        {"name": "Sneha", "confession": "I told my manager I was 'almost done' for 4 consecutive days.", "cringe_score": 82, "survival_probability": 60, "roast": "'Almost done' is a personality disorder at this point.", "verdict": "Temporal illusionist", "era": "Delusional arc", "target_name": None},
        {"name": "Vikram", "confession": "I copy-pasted from StackOverflow without reading it. It's in prod. It works. I don't know why.", "cringe_score": 88, "survival_probability": 80, "roast": "Cargo cult programming achieved sentience. Congrats.", "verdict": "Voodoo developer", "era": "Ctrl-C Ctrl-V", "target_name": None},
        {"name": "Anonymous", "confession": "I fake-laughed at my CEO's joke so convincingly he used it as his opening bit at a conference.", "cringe_score": 91, "survival_probability": 68, "roast": "You are now legally his court jester. Wear the hat.", "verdict": "Unhinged loyalty", "era": "Goblin mode, peak", "target_name": None},
        {"name": "Kavya", "confession": "I've attended every 'mandatory fun' team event while texting from the bathroom.", "cringe_score": 55, "survival_probability": 88, "roast": "Tactical introvert. Respect.", "verdict": "Bathroom bandit", "era": "Tactical escape", "target_name": None},
        {"name": "Dev", "confession": "I broke prod, blamed it on a 'network issue', fixed it in 6 minutes, and nobody ever knew.", "cringe_score": 73, "survival_probability": 92, "roast": "This is not a confession. This is a flex.", "verdict": "Shadow operator", "era": "Sigma dev grind", "target_name": None},
    ]
    results = []
    for i, s in enumerate(seeds_raw):
        hours_ago = (len(seeds_raw) - i) * 8
        ts = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()
        results.append(ConfessionPost(id=f"seed-{i+1}", timestamp=ts, **s))
    return results


_confessions_memory: List[ConfessionPost] = _seed_memory()
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
    _active_sessions[user["id"]] = payload.session_token
    return {"status": "ok"}


@app.get("/auth/validate-session")
def validate_session(
    session_token: str = Query(...),
    user: dict = Depends(require_auth),
):
    stored = _active_sessions.get(user["id"])
    if stored is None:
        return {"status": "valid"}
    if stored != session_token:
        raise HTTPException(status_code=401, detail="Session invalidated. Another device has signed in.")
    return {"status": "valid"}
