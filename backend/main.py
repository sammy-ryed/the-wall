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
import jwt

load_dotenv()

from models import (
    ConfessionIn, RoastOut,
    ConfessionPost, ConfessionSubmit,
    StatsOut, ConfessionsResponse,
    SessionRegister,
    ReplyIn, ReplyOut,
)
from roast import get_roast
from database import SessionLocal, ConfessionModel, ReplyModel, ActiveSessionModel
from sqlalchemy.orm import Session
from sqlalchemy import desc

# Redis caching utilities
from redis_cache_decorator import redis_cache, invalidate_cache

logger = logging.getLogger(__name__)

app = FastAPI(
    title="The Wall API",
    description="Anonymous confession & roast machine — backend API.",
    version="3.0.0"
)

# ---------------------------------------------------------------------------
# Dependency
# ---------------------------------------------------------------------------
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

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
# JWT verification
# ---------------------------------------------------------------------------
security = HTTPBearer(auto_error=False)
NEXTAUTH_SECRET = os.getenv("NEXTAUTH_SECRET", "fallback_secret_for_local_dev_change_in_prod")

def _verify_jwt(token: str) -> Optional[dict]:
    try:
        # We assume NextAuth is configured to issue raw JWS (HS256)
        decoded = jwt.decode(token, NEXTAUTH_SECRET, algorithms=["HS256"])
        user_id = decoded.get("sub") or decoded.get("email")
        if not user_id:
            return None
        return {"id": user_id, "email": decoded.get("email", "")}
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


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()

# ---------------------------------------------------------------------------
# Routes — Public
# ---------------------------------------------------------------------------

@app.get("/health")
def health():
    return {"status": "ok", "version": "3.0.0", "db": "mysql"}


@app.get("/")
def root():
    return {"status": "online", "message": "The Wall API v3.0 — Groq roasts, MySQL storage."}


@app.get("/confessions", response_model=ConfessionsResponse)
@redis_cache(ttl=120)
def list_confessions(
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    sort: str = Query(default="new", pattern="^(new|cringe)$"),
    db: Session = Depends(get_db)
):
    order_col = desc(ConfessionModel.cringe_score) if sort == "cringe" else desc(ConfessionModel.created_at)
    start = (page - 1) * per_page
    
    total = db.query(ConfessionModel).count()
    items = db.query(ConfessionModel).order_by(order_col).offset(start).limit(per_page).all()
    
    confessions_out = []
    for item in items:
        d = item.__dict__.copy()
        if 'created_at' in d and d['created_at']:
            d['timestamp'] = d['created_at'].isoformat()
        else:
            d['timestamp'] = _now_iso()
        confessions_out.append(ConfessionPost(**d))
        
    return ConfessionsResponse(confessions=confessions_out, total=total, page=page, per_page=per_page)


@app.get("/confessions/leaderboard", response_model=list)
@redis_cache(ttl=300)
def leaderboard(limit: int = Query(default=3, ge=1, le=10), db: Session = Depends(get_db)):
    items = db.query(ConfessionModel).order_by(desc(ConfessionModel.cringe_score)).limit(limit).all()
    out = []
    for item in items:
        d = item.__dict__.copy()
        if 'created_at' in d and d['created_at']:
            d['timestamp'] = d['created_at'].isoformat()
        else:
            d['timestamp'] = _now_iso()
        out.append(ConfessionPost(**d).model_dump())
    return out


@app.get("/stats", response_model=StatsOut)
@redis_cache(ttl=300)
def get_stats(db: Session = Depends(get_db)):
    items = db.query(
        ConfessionModel.cringe_score, 
        ConfessionModel.survival_probability, 
        ConfessionModel.era, 
        ConfessionModel.name
    ).all()
    
    total = len(items)
    if total == 0:
        return StatsOut(total_confessions=0, avg_cringe=0.0, lowest_survival=100, most_common_era="—", anon_percent=0.0)

    avg_cringe = round(sum(c.cringe_score for c in items) / total, 1)
    lowest_survival = min(c.survival_probability for c in items)
    
    era_counts = Counter(c.era for c in items)
    most_common_era = era_counts.most_common(1)[0][0] if era_counts else "—"
    
    anon_count = sum(1 for c in items if (c.name or "").strip().lower() in ("anonymous", "anonymous coward", "anon", ""))
    anon_percent = round((anon_count / total) * 100, 1)
    
    return StatsOut(total_confessions=total, avg_cringe=avg_cringe, lowest_survival=lowest_survival, most_common_era=most_common_era, anon_percent=anon_percent)


@app.get("/ticker")
@redis_cache(ttl=300)
def get_ticker(db: Session = Depends(get_db)):
    recent = db.query(ConfessionModel.name, ConfessionModel.cringe_score, ConfessionModel.verdict).order_by(desc(ConfessionModel.created_at)).limit(8).all()
    parts = []
    for c in recent:
        name = (c.name or "ANON").upper()
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
    db: Session = Depends(get_db)
):
    new_id = str(uuid.uuid4())
    db_item = ConfessionModel(
        id=new_id,
        name=payload.name or "Anonymous",
        confession=payload.confession,
        cringe_score=payload.cringe_score,
        survival_probability=payload.survival_probability,
        roast=payload.roast,
        verdict=payload.verdict,
        era=payload.era,
        target_name=payload.target_name,
    )
    try:
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
    except Exception as e:
        db.rollback()
        logger.error(f"DB insert failed: {e}")
        raise HTTPException(status_code=500, detail="Could not save confession.")

    # Invalidate caches after a new confession is added
    invalidate_cache("list_confessions*")
    invalidate_cache("leaderboard*")
    invalidate_cache("get_stats*")
    invalidate_cache("get_ticker*")

    d = db_item.__dict__.copy()
    d['timestamp'] = db_item.created_at.isoformat()
    return ConfessionPost(**d)

# ---------------------------------------------------------------------------
# Routes — Replies
# ---------------------------------------------------------------------------

@app.get("/confessions/{confession_id}/replies", response_model=List[ReplyOut])
@redis_cache(ttl=120)
def get_replies(
    confession_id: str,
    page: int = Query(default=1, ge=1),
    per_page: int = Query(default=20, ge=1, le=100),
    db: Session = Depends(get_db)
):
    query = db.query(ReplyModel).filter(ReplyModel.confession_id == confession_id).order_by(ReplyModel.created_at)
    total = query.count()
    items = query.offset((page - 1) * per_page).limit(per_page).all()
    out = []
    for item in items:
        d = item.__dict__.copy()
        d['created_at'] = item.created_at.isoformat()
        out.append(ReplyOut(**d))
    return out


@app.post("/confessions/{confession_id}/replies", response_model=ReplyOut, status_code=201)
def post_reply(
    confession_id: str,
    payload: ReplyIn,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    if not payload.body.strip():
        raise HTTPException(status_code=400, detail="Reply cannot be empty.")
    
    conf = db.query(ConfessionModel).filter(ConfessionModel.id == confession_id).first()
    if not conf:
        raise HTTPException(status_code=404, detail="Confession not found.")

    new_id = str(uuid.uuid4())
    db_item = ReplyModel(
        id=new_id,
        confession_id=confession_id,
        user_id=user["id"],
        display_name=payload.display_name,
        body=payload.body.strip()
    )
    try:
        db.add(db_item)
        db.commit()
        db.refresh(db_item)
    except Exception as e:
        db.rollback()
        logger.error(f"DB insert reply failed: {e}")
        raise HTTPException(status_code=500, detail="Could not save reply.")

    # Invalidate cached replies for this confession after a new reply is added
    invalidate_cache(f"get_replies:{confession_id}*")

    d = db_item.__dict__.copy()
    d['created_at'] = db_item.created_at.isoformat()
    return ReplyOut(**d)

# ---------------------------------------------------------------------------
# Routes — Single-session enforcement
# ---------------------------------------------------------------------------

@app.post("/auth/register-session")
def register_session(
    payload: SessionRegister,
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    item = db.query(ActiveSessionModel).filter(ActiveSessionModel.user_id == user["id"]).first()
    if item:
        item.session_token = payload.session_token
    else:
        item = ActiveSessionModel(user_id=user["id"], session_token=payload.session_token)
        db.add(item)
    try:
        db.commit()
    except Exception as e:
        db.rollback()
        logger.warning(f"Session DB upsert failed: {e}")
    return {"status": "ok"}


@app.get("/auth/validate-session")
def validate_session(
    session_token: str = Query(...),
    user: dict = Depends(require_auth),
    db: Session = Depends(get_db)
):
    item = db.query(ActiveSessionModel).filter(ActiveSessionModel.user_id == user["id"]).first()
    if not item:
        raise HTTPException(
            status_code=401,
            detail="Session invalidated. No active session registered."
        )
    if item.session_token != session_token:
        raise HTTPException(
            status_code=401,
            detail="Session invalidated. Another device has signed in."
        )
    return {"status": "valid"}
