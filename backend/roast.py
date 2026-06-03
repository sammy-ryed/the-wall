import os
import json
import logging
import random
from anthropic import Anthropic
from models import RoastOut

logger = logging.getLogger(__name__)

# Fallback roasts to use when Anthropic API is not set up or fails
FALLBACK_ROASTS = [
    {
        "cringe_score": 85,
        "survival_probability": 40,
        "roast": "Your code is like a horror movie where the monster is your own incompetence.",
        "verdict": "Technically a developer",
        "era": "GitHub Copilot Era"
    },
    {
        "cringe_score": 92,
        "survival_probability": 15,
        "roast": "This isn't technical debt, this is a financial crisis in font size 12.",
        "verdict": "Future Product Manager",
        "era": "Layoff Speedrun"
    },
    {
        "cringe_score": 78,
        "survival_probability": 65,
        "roast": "You call it creative programming; the git blame history calls it a crime scene.",
        "verdict": "Highly Suspicious Dev",
        "era": "Junior Dev Era"
    },
    {
        "cringe_score": 96,
        "survival_probability": 8,
        "roast": "Even StackOverflow would close this confession as off-topic and low quality.",
        "verdict": "Unlicensed Operator",
        "era": "Late NPC Arc"
    },
    {
        "cringe_score": 60,
        "survival_probability": 85,
        "roast": "A masterclass in doing the bare minimum while looking extremely busy.",
        "verdict": "Strategic Slacker",
        "era": "Quiet Quitting Vibe"
    }
]

def generate_local_roast(confession: str) -> dict:
    """Generates a funny roast locally using heuristics if the API is unavailable."""
    conf_lower = confession.lower()
    
    # Heuristics based on common confession themes
    if any(k in conf_lower for k in ["prod", "production", "deploy", "push", "friday"]):
        return {
            "cringe_score": random.randint(90, 100),
            "survival_probability": random.randint(2, 15),
            "roast": "Chaos agent behavior. The ops team has your git profile picture on a dartboard.",
            "verdict": "Absolute Career Hazard",
            "era": "Doom Scroll Era"
        }
    elif any(k in conf_lower for k in ["refactor", "todo", "debt", "later", "years"]):
        return {
            "cringe_score": random.randint(60, 80),
            "survival_probability": random.randint(50, 85),
            "roast": "That TODO comment will outlive the product, the company, and your current relationships.",
            "verdict": "Debt Accumulator",
            "era": "Legacy Code Vibe"
        }
    elif any(k in conf_lower for k in ["google", "interview", "zoom", "recruiter", "panic"]):
        return {
            "cringe_score": random.randint(75, 90),
            "survival_probability": random.randint(40, 70),
            "roast": "You didn't just dodge a bullet; you shot yourself in the foot to avoid running.",
            "verdict": "Professional Panicker",
            "era": "Fight or Flight"
        }
    elif any(k in conf_lower for k in ["manager", "boss", "ceo", "joke", "meeting"]):
        return {
            "cringe_score": random.randint(80, 95),
            "survival_probability": random.randint(30, 70),
            "roast": "You are now officially the CEO's emotional support developer. Enjoy the court jester promotion.",
            "verdict": "Master Sycophant",
            "era": "Corporate Bootlick"
        }
    elif any(k in conf_lower for k in ["stack", "copy", "paste", "know why", "overflow"]):
        return {
            "cringe_score": random.randint(85, 95),
            "survival_probability": random.randint(70, 90),
            "roast": "Cargo cult programming achieved sentience. If it works, close the IDE and walk away slowly.",
            "verdict": "Voodoo Developer",
            "era": "Ctrl-C Ctrl-V"
        }
    
    # Generic dynamic-ish roast based on length or random selection
    base = random.choice(FALLBACK_ROASTS)
    # Add minor variation
    return {
        "cringe_score": max(10, min(100, base["cringe_score"] + random.randint(-5, 5))),
        "survival_probability": max(0, min(100, base["survival_probability"] + random.randint(-8, 8))),
        "roast": base["roast"],
        "verdict": base["verdict"],
        "era": base["era"]
    }

def get_roast(confession: str) -> RoastOut:
    api_key = os.getenv("ANTHROPIC_API_KEY")
    if not api_key or api_key == "your_key_here":
        logger.warning("ANTHROPIC_API_KEY not set or is placeholder. Using local mock generator.")
        mock_data = generate_local_roast(confession)
        return RoastOut(**mock_data)
        
    try:
        client = Anthropic(api_key=api_key)
        
        system_prompt = (
            "You are a cynical, witty, and brutal AI code and life roaster.\n"
            "Your job is to analyze confessions submitted by anonymous tech workers and developers, and roast them.\n"
            "You must respond ONLY with a raw JSON object. Do not include any markdown formatting, do not wrap the JSON in ```json code blocks, do not include any text before or after the JSON.\n"
            "The JSON must follow this exact schema:\n"
            "{\n"
            '  "cringe_score": int,          // 0-100 integer representing how cringe the confession is\n'
            '  "survival_probability": int,  // 0-100 integer representing the percent chance they survive this in their career/life\n'
            '  "roast": "string",            // A brutal, witty, and funny roast about their confession. MUST BE 20 words or less.\n'
            '  "verdict": "string",          // A quick final verdict summary. MUST BE 5 words or less.\n'
            '  "era": "string"               // A fun classification label for the vibe/era. MUST BE 4 words or less.\n'
            "}"
        )
        
        user_message = f"Here is the confession: \"{confession}\""
        
        # Call the Anthropic API
        response = client.messages.create(
            model="claude-sonnet-4-20250514",
            max_tokens=1000,
            system=system_prompt,
            messages=[
                {"role": "user", "content": user_message}
            ]
        )
        
        response_text = response.content[0].text.strip()
        
        # Clean response if wrapped in code blocks
        if response_text.startswith("```"):
            lines = response_text.splitlines()
            if lines[0].startswith("```"):
                lines = lines[1:]
            if lines[-1].startswith("```"):
                lines = lines[:-1]
            response_text = "\n".join(lines).strip()
            
        data = json.loads(response_text)
        
        # Ensure it conforms to fields & limits
        roast_text = data.get("roast", "No words.")
        if len(roast_text.split()) > 20:
            roast_text = " ".join(roast_text.split()[:20])
            
        verdict_text = data.get("verdict", "Guilty.")
        if len(verdict_text.split()) > 5:
            verdict_text = " ".join(verdict_text.split()[:5])
            
        era_text = data.get("era", "Modern Arc")
        if len(era_text.split()) > 4:
            era_text = " ".join(era_text.split()[:4])
            
        return RoastOut(
            cringe_score=int(data.get("cringe_score", 50)),
            survival_probability=int(data.get("survival_probability", 50)),
            roast=roast_text,
            verdict=verdict_text,
            era=era_text
        )
        
    except Exception as e:
        logger.error(f"Error calling Claude API: {e}. Falling back to local mock generator.")
        mock_data = generate_local_roast(confession)
        return RoastOut(**mock_data)
