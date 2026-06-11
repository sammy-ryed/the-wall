import os
import json
import logging
import re
import random
from typing import Optional, Tuple

logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────
# Personal-target detection
# ─────────────────────────────────────────────────────────────────

# Relationship words that indicate "I'm talking about someone else"
_RELATIONSHIPS = (
    r"friend|roommate|flatmate|batchmate|colleague|coworker|co-worker|teammate|"
    r"boss|manager|senior|junior|intern|professor|teacher|classmate|"
    r"ex|ex-boyfriend|ex-girlfriend|ex-gf|ex-bf|partner|neighbour|neighbor|"
    r"brother|sister|cousin|uncle|aunt|dad|mom|father|mother"
)

# Third-person nouns (don't need "my" prefix)
_THIRD_PERSON_NOUNS = (
    r"guy|girl|dude|man|woman|person|clown|idiot|moron|jerk|"
    r"creep|asshole|bastard|prick|douche|loser|coward|fraud"
)

# Betrayal / wrongdoing verbs
_WRONG_VERBS = (
    r"stole|took credit|blamed|lied|cheated|copied|plagiarized|mansplained|"
    r"gaslit|ghosted|ratted|snitched|betrayed|humiliated|embarrassed|"
    r"took my|claimed my|presented my"
)

_PATTERNS: list[Tuple[re.Pattern, str]] = [
    # "my friend Sarah" / "my boss" / "my roommate"
    (
        re.compile(
            rf"\bmy\s+({_RELATIONSHIPS})\b(?:\s+([A-Z][a-z]{{2,}}))?",
            re.IGNORECASE,
        ),
        "relationship",
    ),
    # Proper name at sentence start + action verb
    (
        re.compile(
            r"^([A-Z][a-z]{2,}(?:\s+[A-Z][a-z]+)?)\s+"
            r"(?:keeps|always|never|just|literally|told|said|did|does|has been|"
            r"stole|takes|took|blamed|lied|cheated|copied|plagiarized|"
            r"mansplained|gaslit|ghosted|claimed|presented)\b"
        ),
        "name_start",
    ),
    # Named person + betrayal verb anywhere
    (
        re.compile(rf"\b([A-Z][a-z]{{2,}})\s+(?:{_WRONG_VERBS})\b"),
        "named_wrongdoer",
    ),
    # "this guy / this clown / this asshole"
    (
        re.compile(rf"\bthis\s+({_THIRD_PERSON_NOUNS})\b", re.IGNORECASE),
        "this_person",
    ),
    # "someone at my work/office/company/team"
    (
        re.compile(
            r"\bsomeone\s+(?:at|in|from)\s+(?:my\s+)?(?:work|office|company|team|class|school|college|startup)\b",
            re.IGNORECASE,
        ),
        "someone_at_work",
    ),
]


def detect_personal_target(confession: str) -> Tuple[bool, Optional[str]]:
    """
    Returns (is_personal, target_description).
    target_description: a name like "Rahul", or a description like "your roommate".
    """
    for pattern, kind in _PATTERNS:
        m = pattern.search(confession)
        if not m:
            continue

        if kind == "relationship":
            relationship = m.group(1)
            name = m.group(2) if m.lastindex and m.lastindex >= 2 else None
            return True, name if name else f"your {relationship.lower()}"

        if kind in ("name_start", "named_wrongdoer"):
            return True, m.group(1)

        if kind == "this_person":
            return True, f"that {m.group(1).lower()}"

        if kind == "someone_at_work":
            return True, "that person at your workplace"

    return False, None


# ─────────────────────────────────────────────────────────────────
# Fallback roasts (used when Groq key is missing / API fails)
# ─────────────────────────────────────────────────────────────────

_FALLBACK_SELF = [
    {"cringe_score": 85, "survival_probability": 40, "roast": "Your code is a horror movie where the monster is your own incompetence — and the scariest part is you committed it to main with the message 'final fix for real this time'. Every senior dev who reviews this file has lost years off their life.", "verdict": "Technically a developer", "era": "GitHub Copilot Era", "target_name": None},
    {"cringe_score": 92, "survival_probability": 15, "roast": "This isn't technical debt, it's a financial crisis in font size 12. You have somehow taken a perfectly normal situation and turned it into something that will haunt your LinkedIn profile for a decade. The audacity. The sheer, weaponized audacity.", "verdict": "Future Product Manager", "era": "Layoff Speedrun", "target_name": None},
    {"cringe_score": 78, "survival_probability": 65, "roast": "You call it creative programming. Git blame calls it a crime scene. Stack Overflow calls it a duplicate question from 2009. Your future self, debugging this at 2am, will call it something far less printable. Congratulations on the world record for self-inflicted damage.", "verdict": "Highly Suspicious Dev", "era": "Junior Dev Era", "target_name": None},
    {"cringe_score": 96, "survival_probability": 8, "roast": "Even Stack Overflow would close this as off-topic, low quality, and a danger to society. You have somehow made an entire community of strangers who hate each other agree on something: this is terrible and you should feel terrible. That's genuinely impressive in the worst way.", "verdict": "Unlicensed Operator", "era": "Late NPC Arc", "target_name": None},
    {"cringe_score": 60, "survival_probability": 85, "roast": "A masterclass in doing the bare minimum while looking extremely busy — you've turned slacking into a discipline, a career, almost an art form. Your manager thinks you're swamped. You're watching Netflix. Honestly? Respect. Disgusting, soul-corroding respect.", "verdict": "Strategic Slacker", "era": "Quiet Quitting Vibe", "target_name": None},
]

_FALLBACK_PERSONAL = [
    {"cringe_score": 97, "survival_probability": 3, "roast": "Let's be absolutely clear about what kind of person does this: a coward in a human costume. The absolute gall, the audacity wrapped in stupidity, deep fried in entitlement. Whatever karma {target} has been dodging is now overdue with interest. Hope every door they push is a pull door forever.", "verdict": "Certified dumpster fire", "era": "Trash Human Arc", "target_name": "{target}"},
    {"cringe_score": 94, "survival_probability": 6, "roast": "What a certified, gold-plated ass. {target} looked at basic human decency, decided it wasn't for them, and somehow convinced themselves they were the main character. Spoiler: they're not even a recurring extra. The universe has a long memory and a bad mood. Deserved doesn't cover it.", "verdict": "Irredeemable clown", "era": "Peak Scumbag Era", "target_name": "{target}"},
    {"cringe_score": 89, "survival_probability": 12, "roast": "The fact that {target} exists and does this means we have genuinely failed as a civilization. Not just morally — structurally. This person will one day give advice at a dinner party and people will nod politely while screaming inside. Karma takes its time, but it never forgets an address.", "verdict": "Karmic bankruptcy", "era": "Self-destruction arc", "target_name": "{target}"},
]



def _local_fallback(confession: str, is_personal: bool, target: Optional[str]) -> dict:
    if is_personal:
        base = random.choice(_FALLBACK_PERSONAL)
        result = dict(base)
        result["target_name"] = (target or "that person")
        return result

    lower = confession.lower()
    if any(k in lower for k in ["prod", "production", "deploy", "friday"]):
        return {"cringe_score": random.randint(90, 100), "survival_probability": random.randint(2, 15), "roast": "Chaos agent. The ops team has your photo on a dartboard.", "verdict": "Career hazard", "era": "Doom deploy Era", "target_name": None}
    if any(k in lower for k in ["refactor", "todo", "debt", "later", "years"]):
        return {"cringe_score": random.randint(60, 80), "survival_probability": random.randint(50, 85), "roast": "That TODO comment will outlive the product, company, and your relationships.", "verdict": "Debt accumulator", "era": "Legacy code vibe", "target_name": None}
    if any(k in lower for k in ["google", "interview", "zoom", "recruiter", "panic"]):
        return {"cringe_score": random.randint(75, 90), "survival_probability": random.randint(40, 70), "roast": "You shot yourself in the foot to avoid running the race.", "verdict": "Professional panicker", "era": "Fight or flight", "target_name": None}
    if any(k in lower for k in ["manager", "boss", "ceo", "joke", "meeting"]):
        return {"cringe_score": random.randint(80, 95), "survival_probability": random.randint(30, 70), "roast": "You're now officially the CEO's emotional support developer. Congrats, court jester.", "verdict": "Master sycophant", "era": "Corporate bootlick", "target_name": None}

    base = random.choice(_FALLBACK_SELF)
    return {**base, "cringe_score": max(10, min(100, base["cringe_score"] + random.randint(-5, 5))), "survival_probability": max(0, min(100, base["survival_probability"] + random.randint(-8, 8)))}


# ─────────────────────────────────────────────────────────────────
# Groq prompts
# ─────────────────────────────────────────────────────────────────

_SCHEMA_NOTE = (
    'Respond ONLY with a raw JSON object. No markdown, no code blocks, nothing else.\n'
    'Schema:\n'
    '{\n'
    '  "cringe_score": int,           // 0-100\n'
    '  "survival_probability": int,   // 0-100\n'
    '  "roast": "string",             // 40-60 words. Build up the burn then end with a devastating mic-drop closer.\n'
    '  "verdict": "string",           // MAX 5 words — a cold, damning label\n'
    '  "era": "string",               // MAX 4 words — a hilariously specific life-era label\n'
    '  "target_name": null or "string"\n'
    '}'
)

_SELF_ROAST_SYSTEM = (
    "You are The Wall's roast engine — a vicious, sharp-tongued AI that exists solely to destroy people with their own confessions.\n"
    "You are Gordon Ramsay crossed with a disappointed parent and a stand-up comedian who has nothing to lose.\n"
    "Rules:\n"
    "- The roast MUST be 40-60 words. Build up a narrative, pile on the shame, then end with a single devastating sentence.\n"
    "- Be SPECIFIC to whatever they confessed. Generic roasts are FAILURE. Reference the exact details they gave.\n"
    "- Be funny-mean, not just mean. The humour makes the burn land harder.\n"
    "- Use vivid metaphors, absurd comparisons, and brutally accurate observations.\n"
    "- Mild profanity is fine (ass, damn, hell, shit — no slurs, nothing illegal).\n"
    "- cringe_score: how embarrassing this is on a scale of 0-100. Be brutal — most confessions deserve 70+.\n"
    "- survival_probability: their chances of surviving socially/professionally after this. Be merciless.\n"
    "- target_name must ALWAYS be null for self-confessions.\n\n"
    + _SCHEMA_NOTE
)

def _personal_roast_system(target: str) -> str:
    return (
        f"You are The Wall's attack dog AI. Someone just confessed what **{target}** did to them.\n"
        f"You are COMPLETELY on the confessor's side. Your ONLY job: obliterate {target} with words.\n"
        f"Rules:\n"
        f"- The roast MUST be 40-60 words. Start by setting the scene, pile on the shame, end with a mic-drop.\n"
        f"- Be SPECIFIC to what {target} actually did. Don't be vague. Reference the exact crime.\n"
        f"- Be vicious AND funny. The humour makes the knife twist harder.\n"
        f"- Use vivid insults, absurd comparisons, and devastating observations about {target}'s character.\n"
        f"- Light profanity is ENCOURAGED (shit, ass, bastard, damn — no slurs).\n"
        f"- cringe_score = {target}'s cringe level (0-100). survival_probability = their social survival odds.\n"
        f"- target_name MUST be set to exactly: \"{target}\"\n\n"
        + _SCHEMA_NOTE
    )


# ─────────────────────────────────────────────────────────────────
# Main roast function
# ─────────────────────────────────────────────────────────────────

from models import RoastOut


def get_roast(confession: str) -> RoastOut:
    is_personal, target = detect_personal_target(confession)

    api_key = os.getenv("GROQ_API_KEY")
    if not api_key or api_key == "your_groq_key_here":
        logger.warning("GROQ_API_KEY not set. Using local fallback.")
        data = _local_fallback(confession, is_personal, target)
        return RoastOut(**data)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        system = _personal_roast_system(target) if is_personal else _SELF_ROAST_SYSTEM
        user_msg = f'Confession: "{confession}"'

        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user_msg},
            ],
            max_tokens=600,
            temperature=1.0,
        )

        raw = response.choices[0].message.content.strip()

        # Strip markdown fences if model adds them anyway
        if raw.startswith("```"):
            lines = raw.splitlines()
            lines = [l for l in lines if not l.startswith("```")]
            raw = "\n".join(lines).strip()

        data = json.loads(raw)

        # Enforce word limits
        roast_text = " ".join(data.get("roast", "No words.").split()[:60])
        verdict_text = " ".join(data.get("verdict", "Guilty.").split()[:5])
        era_text = " ".join(data.get("era", "Modern Arc").split()[:4])

        # Enforce target_name
        parsed_target = data.get("target_name") or (target if is_personal else None)

        return RoastOut(
            cringe_score=int(data.get("cringe_score", 50)),
            survival_probability=int(data.get("survival_probability", 50)),
            roast=roast_text,
            verdict=verdict_text,
            era=era_text,
            target_name=parsed_target,
        )

    except Exception as e:
        logger.error(f"Groq API error: {e}. Falling back to local generator.")
        data = _local_fallback(confession, is_personal, target)
        return RoastOut(**data)
