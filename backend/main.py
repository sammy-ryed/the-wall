import os
import uuid
from collections import Counter
from typing import List, Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

from models import (
    ConfessionIn, RoastOut,
    ConfessionPost, ConfessionSubmit,
    StatsOut, ConfessionsResponse
)
from roast import get_roast

app = FastAPI(
    title="The Wall API",
    description="Anonymous confession & roast machine — backend API.",
    version="2.0.0"
)

# ---------------------------------------------------------------------------
# CORS — reads from env so deploying to EC2 just needs ALLOWED_ORIGINS set
# ---------------------------------------------------------------------------
_raw_origins = os.getenv(
    "ALLOWED_ORIGINS",
    "http://localhost:3000,http://127.0.0.1:3000,http://localhost:3001,http://127.0.0.1:3001"
)
origins = [o.strip() for o in _raw_origins.split(",") if o.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# In-memory store — seeded with the canonical 8 confessions.
# On t3.micro without a DB this is wiped on restart. Good enough for now.
# ---------------------------------------------------------------------------
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
        # Give seeds timestamps spread over the last 3 days
        hours_ago = (len(seeds_raw) - i) * 8
        ts = f"{hours_ago}h ago" if hours_ago < 48 else f"{hours_ago // 24}d ago"
        results.append(ConfessionPost(
            id=f"seed-{i+1}",
            timestamp=ts,
            **s
        ))
    return results

_confessions: List[ConfessionPost] = _seed()

# ---------------------------------------------------------------------------
# Helper — compute stats from current store
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
# Routes
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    """AWS load balancer / uptime check."""
    return {"status": "ok", "version": "2.0.0"}


@app.get("/")
def root():
    return {
        "status": "online",
        "message": "The Wall API v2 — POST /roast, GET /confessions, GET /stats, GET /confessions/leaderboard"
    }


@app.post("/roast", response_model=RoastOut)
def roast_confession(payload: ConfessionIn):
    """
    Step 1 — user submits a confession, gets a roast back.
    Does NOT save to the wall — user must explicitly POST /confessions to publish.
    """
    if not payload.confession or not payload.confession.strip():
        raise HTTPException(status_code=400, detail="Confession cannot be empty.")
    try:
        return get_roast(payload.confession)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Roast engine failed: {str(e)}")


@app.post("/confessions", response_model=ConfessionPost, status_code=201)
def post_confession(payload: ConfessionSubmit):
    """
    Step 2 — user publishes their roast to the wall.
    Called after /roast, when user clicks 'post to wall'.
    """
    # Use "just now" — strftime %-I is Linux-only; keep it simple
    timestamp = "just now"

    entry = ConfessionPost(
        id=str(uuid.uuid4()),
        name=payload.name or "Anonymous",
        confession=payload.confession,
        cringe_score=payload.cringe_score,
        survival_probability=payload.survival_probability,
        roast=payload.roast,
        verdict=payload.verdict,
        era=payload.era,
        timestamp=timestamp,
    )
    # Prepend so newest is first
    _confessions.insert(0, entry)
    return entry


@app.get("/confessions", response_model=ConfessionsResponse)
def list_confessions(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="new", pattern="^(new|cringe)$"),
):
    """
    Returns paginated confessions sorted by newest (default) or highest cringe.
    GET /confessions?sort=cringe&page=1&per_page=20
    """
    if sort == "cringe":
        ordered = sorted(_confessions, key=lambda c: c.cringe_score, reverse=True)
    else:
        ordered = list(_confessions)  # already newest-first

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
    """
    Hall of Shame — top N confessions by cringe score.
    """
    ordered = sorted(_confessions, key=lambda c: c.cringe_score, reverse=True)
    return [c.model_dump() for c in ordered[:limit]]


@app.get("/stats", response_model=StatsOut)
def get_stats():
    """Live wall-wide stats — avg cringe, lowest survival, most common era, anon %."""
    return _compute_stats()


@app.get("/ticker")
def get_ticker():
    """
    Returns a string of ticker entries built from the most recent 8 confessions.
    Frontend scrolls this as the marquee.
    """
    recent = _confessions[:8]
    parts = []
    for c in recent:
        name = c.name.upper()
        parts.append(f"{name} scored {c.cringe_score} cringe")
        parts.append(f"{name}: \"{c.verdict}\"")
    parts.append("YOUR CONFESSION IS NEXT")
    ticker_text = "    ///    ".join(parts)
    # Double it for seamless loop
    return {"text": f"    {ticker_text}    ///    {ticker_text}    "}
