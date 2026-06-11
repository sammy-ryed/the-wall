from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime


class ConfessionIn(BaseModel):
    confession: str = Field(..., max_length=500, description="The confession text to roast.")


class RoastOut(BaseModel):
    cringe_score: int = Field(..., ge=0, le=100)
    survival_probability: int = Field(..., ge=0, le=100)
    roast: str
    verdict: str
    era: str
    target_name: Optional[str] = None  # Set when roasting someone else on the confessor's behalf


class ConfessionPost(BaseModel):
    """Full stored confession — returned by GET /confessions and POST /confessions."""
    id: str
    name: str
    confession: str
    cringe_score: int
    survival_probability: int
    roast: str
    verdict: str
    era: str
    timestamp: str          # ISO 8601 UTC
    target_name: Optional[str] = None

    @classmethod
    def from_db_row(cls, row: dict) -> "ConfessionPost":
        """Map a Supabase DB row to this model."""
        return cls(
            id=str(row["id"]),
            name=row["name"],
            confession=row["confession"],
            cringe_score=row["cringe_score"],
            survival_probability=row["survival_probability"],
            roast=row["roast"],
            verdict=row["verdict"],
            era=row["era"],
            timestamp=row.get("created_at", ""),
            target_name=row.get("target_name"),
        )


class ConfessionSubmit(BaseModel):
    """Payload to POST /confessions — saves a roasted confession to the wall."""
    name: Optional[str] = Field(default="Anonymous", max_length=40)
    confession: str = Field(..., max_length=500)
    cringe_score: int = Field(..., ge=0, le=100)
    survival_probability: int = Field(..., ge=0, le=100)
    roast: str
    verdict: str
    era: str
    target_name: Optional[str] = None


class StatsOut(BaseModel):
    total_confessions: int
    avg_cringe: float
    lowest_survival: int
    most_common_era: str
    anon_percent: float


class ConfessionsResponse(BaseModel):
    confessions: List[ConfessionPost]
    total: int
    page: int
    per_page: int


class SessionRegister(BaseModel):
    """Payload to register an active session token."""
    session_token: str


class ReplyIn(BaseModel):
    """Payload to POST /confessions/{id}/replies."""
    body: str = Field(..., min_length=1, max_length=280, description="Reply text, max 280 characters.")
    display_name: str = Field(..., max_length=60, description="Replier's display name (email prefix or OAuth name).")


class ReplyOut(BaseModel):
    """A stored reply returned by GET/POST /confessions/{id}/replies."""
    id: str
    confession_id: str
    user_id: str
    display_name: str
    body: str
    created_at: str  # ISO 8601 UTC

    @classmethod
    def from_db_row(cls, row: dict) -> "ReplyOut":
        return cls(
            id=str(row["id"]),
            confession_id=str(row["confession_id"]),
            user_id=str(row["user_id"]),
            display_name=row["display_name"],
            body=row["body"],
            created_at=row.get("created_at", ""),
        )
