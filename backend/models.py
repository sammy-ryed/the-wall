from pydantic import BaseModel, Field
from typing import Optional, List

class ConfessionIn(BaseModel):
    confession: str = Field(..., max_length=500, description="The confession text to roast.")

class RoastOut(BaseModel):
    cringe_score: int = Field(..., ge=0, le=100)
    survival_probability: int = Field(..., ge=0, le=100)
    roast: str
    verdict: str
    era: str

class ConfessionPost(BaseModel):
    """Full stored confession."""
    id: str
    name: str
    confession: str
    cringe_score: int
    survival_probability: int
    roast: str
    verdict: str
    era: str
    timestamp: str  # ISO 8601 UTC

class ConfessionSubmit(BaseModel):
    """Payload to POST /confessions."""
    name: Optional[str] = Field(default="Anonymous", max_length=40)
    confession: str = Field(..., max_length=500)
    cringe_score: int = Field(..., ge=0, le=100)
    survival_probability: int = Field(..., ge=0, le=100)
    roast: str
    verdict: str
    era: str

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
