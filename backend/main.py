import os
import uuid
import logging
from collections import Counter
from datetime import datetime, timezone
from typing import List, Optional

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
    version="2.1.0"
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
# Supabase admin client — for JWT verification and session management
# ---------------------------------------------------------------------------
_supabase_url = os.getenv("SUPABASE_URL", "")
_supabase_service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")

try:
    from supabase import create_client, Client as SupabaseClient
    _supabase: Optional[SupabaseClient] = (
        create_client(_supabase_url, _supabase_service_key)
        if _supabase_url and _supabase_service_key
        else None
    )
except Exception as e:
    logger.warning(f"Supabase client init failed: {e}. Auth enforcement will be skipped.")
    _supabase = None

# ---------------------------------------------------------------------------
# JWT verification helper
# ---------------------------------------------------------------------------
security = HTTPBearer(auto_error=False)

def verify_token(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> Optional[dict]:
    """
    Verifies the Supabase JWT. Returns user dict if valid, None if no token.
    Raises 401 if token is present but invalid.
    """
    if not credentials:
        return None
    if not _supabase:
        # Supabase not configured — accept token as-is (dev mode)
        return {"id": "dev-user"}
    try:
        response = _supabase.auth.get_user(credentials.credentials)
        if response.user:
            return {"id": response.user.id, "email": response.user.email}
    except Exception as e:
        logger.warning(f"JWT verification failed: {e}")
        raise HTTPException(status_code=401, detail="Invalid or expired token.")
    raise HTTPException(status_code=401, detail="Invalid token.")


def require_auth(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(security),
) -> dict:
    """Like verify_token but raises 401 if no token at all."""
    user = verify_token(credentials)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required.")
    return user

# ---------------------------------------------------------------------------
# In-memory store — seeded with canonical confessions
# ---------------------------------------------------------------------------
def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

def _seed() -> List[ConfessionPost]:
    seeds_raw = [
        {
            "name": "Rahul",
            "confession": "I pushed to production on a Friday at 5pm and immediately went offline. Left the country.",
            "cringe_score": 97, "survival_probability": 4,
            "roast": "You didn't go on vacation. You fled the scene of a crime.",
            "verdict": "Chaos agent", "era": "Post-accountability arc",
        },
        {
            "name": "Priya",
            "confession": "I've been saying 'I'll refactor this later' for 3 years. It's still there. It powers billing.",
            "cringe_score": 61, "survival_probability": 71,
            "roast": "Technical debt is just emotional debt in a trench coat.",
            "verdict": "Relatable villain", "era": "Legacy code era",
        },
        {
            "name": "Arjun",
            "confession": "I ghosted a recruiter from Google because I panicked during the Zoom call. Never rescheduled.",
            "cringe_score": 78, "survival_probability": 55,
            "roast": "You dodged Google and hit yourself in the face on the way out.",
            "verdict": "Self-saboteur", "era": "Late NPC arc",
        },
        {
            "name": "Sneha",
            "confession": "I told my manager I was 'almost done' for 4 consecutive days.",
            "cringe_score": 82, "survival_probability": 60,
            "roast": "'Almost done' is a personality disorder at this point.",
            "verdict": "Temporal illusionist", "era": "Delusional arc",
        },
        {
            "name": "Vikram",
            "confession": "I copy-pasted from StackOverflow without reading it. It's in prod. It works. I don't know why.",
            "cringe_score": 88, "survival_probability": 80,
            "roast": "Cargo cult programming achieved sentience. Congrats.",
            "verdict": "Voodoo developer", "era": "Ctrl-C Ctrl-V",
        },
        {
            "name": "Anonymous",
            "confession": "I fake-laughed at my CEO's joke so convincingly he used it as his opening bit at a conference.",
            "cringe_score": 91, "survival_probability": 68,
            "roast": "You are now legally his court jester. Wear the hat.",
            "verdict": "Unhinged loyalty", "era": "Goblin mode, peak",
        },
        {
            "name": "Kavya",
            "confession": "I've attended every 'mandatory fun' team event while texting from the bathroom.",
            "cringe_score": 55, "survival_probability": 88,
            "roast": "Tactical introvert. Respect.",
            "verdict": "Bathroom bandit", "era": "Tactical escape",
        },
        {
            "name": "Dev",
            "confession": "I broke prod, blamed it on a 'network issue', fixed it in 6 minutes, and nobody ever knew.",
            "cringe_score": 73, "survival_probability": 92,
            "roast": "This is not a confession. This is a flex.",
            "verdict": "Shadow operator", "era": "Sigma dev grind",
        },
    ]

    results = []
    for i, s in enumerate(seeds_raw):
        hours_ago = (len(seeds_raw) - i) * 8
        # Compute an actual ISO timestamp for seeds
        from datetime import timedelta
        ts = (datetime.now(timezone.utc) - timedelta(hours=hours_ago)).isoformat()
        results.append(ConfessionPost(
            id=f"seed-{i+1}",
            timestamp=ts,
            **s
        ))
    return results

_confessions: List[ConfessionPost] = _seed()

# Single-session store: user_id -> session_token
_active_sessions: dict[str, str] = {}

# ---------------------------------------------------------------------------
# Stats helper
# ---------------------------------------------------------------------------
def _compute_stats() -> StatsOut:
    total = len(_confessions)
    if total == 0:
        return StatsOut(
            total_confessions=0, avg_cringe=0.0,
            lowest_survival=100, most_common_era="—", anon_percent=0.0
        )
    avg_cringe = round(sum(c.cringe_score for c in _confessions) / total, 1)
    lowest_survival = min(c.survival_probability for c in _confessions)
    era_counts = Counter(c.era for c in _confessions)
    most_common_era = era_counts.most_common(1)[0][0]
    anon_count = sum(1 for c in _confessions if c.name.strip().lower() in ("anonymous", "anonymous coward", "anon", ""))
    anon_percent = round((anon_count / total) * 100, 1)
    return StatsOut(
        total_confessions=total,
        avg_cringe=avg_cringe,
        lowest_survival=lowest_survival,
        most_common_era=most_common_era,
        anon_percent=anon_percent,
    )

# ---------------------------------------------------------------------------
# Routes — Public
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "version": "2.1.0"}


@app.get("/")
def root():
    return {
        "status": "online",
        "message": "The Wall API v2.1 — auth-gated confessions, Groq roasts."
    }


@app.get("/confessions", response_model=ConfessionsResponse)
def list_confessions(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="new", pattern="^(new|cringe)$"),
):
    if sort == "cringe":
        ordered = sorted(_confessions, key=lambda c: c.cringe_score, reverse=True)
    else:
        ordered = list(_confessions)

    total = len(ordered)
    start = (page - 1) * per_page
    end = start + per_page
    page_items = ordered[start:end]

    return ConfessionsResponse(
        confessions=page_items,
        total=total,
        page=page,
        per_page=per_page,
    )


@app.get("/confessions/leaderboard", response_model=list)
def leaderboard(limit: int = Query(default=3, ge=1, le=10)):
    ordered = sorted(_confessions, key=lambda c: c.cringe_score, reverse=True)
    return [c.model_dump() for c in ordered[:limit]]


@app.get("/stats", response_model=StatsOut)
def get_stats():
    return _compute_stats()


@app.get("/ticker")
def get_ticker():
    recent = _confessions[:8]
    parts = []
    for c in recent:
        name = c.name.upper()
        parts.append(f"{name} scored {c.cringe_score} cringe")
        parts.append(f"{name}: \"{c.verdict}\"")
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
    """
    Step 1 — authenticated user submits a confession, gets a roast back.
    Does NOT save to the wall.
    """
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
    """
    Step 2 — authenticated user publishes their roast to the wall.
    """
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
    )
    _confessions.insert(0, entry)
    return entry

# ---------------------------------------------------------------------------
# Routes — Single-session enforcement
# ---------------------------------------------------------------------------

@app.post("/auth/register-session")
def register_session(
    payload: SessionRegister,
    user: dict = Depends(require_auth),
):
    """
    Called right after login. Stores the new session token for this user,
    invalidating any previous session from another device.
    """
    _active_sessions[user["id"]] = payload.session_token
    return {"status": "ok"}


@app.get("/auth/validate-session")
def validate_session(
    session_token: str = Query(...),
    user: dict = Depends(require_auth),
):
    """
    Called periodically by the frontend to check if this session is still active.
    Returns 200 if valid, 401 if another device has taken over.
    """
    stored = _active_sessions.get(user["id"])
    if stored is None:
        # No session registered yet — treat as valid (grace period)
        return {"status": "valid"}
    if stored != session_token:
        raise HTTPException(
            status_code=401,
            detail="Session invalidated. Another device has signed in."
        )
    return {"status": "valid"}
