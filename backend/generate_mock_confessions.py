#!/usr/bin/env python3
"""
generate_mock_confessions.py

Generates 10,000 realistic, funny, unhinged internet confessions + roasts
and writes them as INSERT INTO statements into `mock_confessions.sql`.

Usage:
    pip install faker
    python generate_mock_confessions.py

Then import into MySQL:
    mysql -u youruser -p yourdatabase < mock_confessions.sql
"""

import random
import uuid
from datetime import datetime, timedelta

from faker import Faker

fake = Faker()

# ----------------------------------------------------------------------
# CONFIG
# ----------------------------------------------------------------------
NUM_ROWS = 10_000
TABLE_NAME = "confessions"
OUTPUT_FILE = "mock_confessions.sql"
BATCH_SIZE = 500  # rows per INSERT statement (keeps statements from getting absurd)

# ----------------------------------------------------------------------
# NAME POOLS
# ----------------------------------------------------------------------
ANON_NAMES = [
    "Anonymous", "Anonymous", "Anonymous",  # weighted higher
    "A Concerned Citizen", "Definitely Not Me", "Throwaway_Account_47",
    "A Guy Who Regrets Everything", "Sleep Deprived Sophomore",
    "The Group Project Ghost", "Emotional Damage Enjoyer",
    "Certified Disaster", "A Raccoon In A Hoodie", "Professional Overthinker",
    "Guy With 3 Unread Emails From HR", "Someone's Red Flag",
    "The Reply Guy", "Chaotic Neutral Intern", "Mildly Cursed Human",
]

FUNNY_HANDLES = [
    "xX{word}Xx", "{word}_official", "not_a_bot_{num}", "{word}enjoyer",
    "big_{word}_energy", "{word}_but_worse", "certified_{word}",
    "{word}core", "the_real_{word}", "{word}_incident_2024",
]

FILLER_WORDS = [
    "goblin", "gremlin", "menace", "disaster", "feral", "unhinged",
    "raccoon", "possum", "chaos", "villain", "clown", "gremlin",
]

# ----------------------------------------------------------------------
# CONFESSION TEMPLATES
# Each template can use Faker-generated fillers for variety.
# ----------------------------------------------------------------------
CONFESSION_TEMPLATES = [
    "I told my whole friend group I was 'busy' but I was actually just re-watching {show} alone for the {ord} time.",
    "I accidentally liked my ex's photo from {years} years ago while stalking their profile at 2am. I panicked and deleted the app.",
    "I've been pretending to know how to use Excel at my job at {company} for {months} months. I just Google every formula.",
    "I told my roommate the milk went bad so I wouldn't have to admit I drank the whole carton at 1am.",
    "I clapped at the end of a movie in the theater and I was the only one who did it. Nobody made eye contact with me after.",
    "I sent a voice note complaining about my friend to the wrong chat. The chat included that friend. It's been {days} days and nobody has mentioned it.",
    "I still haven't told my parents I dropped {course} last semester. I've been faking assignments in group chats.",
    "I laughed so hard at my own joke in a meeting at {company} that I didn't hear my boss ask me a direct question twice.",
    "I've rewatched the same {num}-second video of a dog sneezing probably {views} times this month instead of doing my assignments.",
    "I told my date I was a vegetarian to sound interesting and then ordered chicken wings out of pure panic.",
    "I said 'love you too' to my Uber driver because I was on autopilot from texting my mom. We never spoke again.",
    "I've had the same three unread emails from {company} sitting in my inbox for {months} months and I genuinely think ignoring them is a personality trait now.",
    "I told my group project members I had 'family stuff' but I was actually just afraid of public speaking during our presentation.",
    "I pretended to be sick to skip {event} and then posted a story an hour later without thinking.",
    "I've called my professor 'mom' in class {num} separate times this semester and every time I want to disappear.",
    "I still use my ex's Netflix account and I feel nothing but I also refuse to make my own.",
    "I told everyone at {company} I run marathons but I've genuinely never run more than {num} minutes without stopping.",
    "I set {num} alarms every morning and snooze every single one, then blame 'traffic' for being late to work.",
    "I ghosted a group chat of {num} people because someone asked a genuine question and I didn't want to answer it.",
    "I told my landlord my sink was 'a little slow' when it has actually been fully clogged for {months} months.",
    "I once cried during {brand} commercial and then immediately lied to my roommate about having allergies.",
    "I've never actually finished {show} but I confidently argue about the ending at every party.",
    "I told my boss I was in a 'doctor's appointment' during a meeting so I could nap for {num} minutes in my car.",
    "I matched with my cousin's friend on a dating app and neither of us has said anything about it since.",
    "I microwaved fish at work in the {company} breakroom and then blamed it on someone from another department.",
    "I told my group of friends I was 'working on myself' as an excuse for not replying to texts for {days} days straight.",
    "I have {num} unread notifications and the number has become part of my personality at this point.",
    "I accidentally called my professor 'babe' during office hours and just kept talking like it didn't happen.",
    "I told a stranger at the gym I was a personal trainer because I panicked when they asked for advice.",
    "I've said 'I'll start Monday' about the same goal for {num} months straight.",
    "I still haven't watched the {ord} season of {show} because I'm scared of how attached I'll get again.",
    "I told my friends I 'forgot' about their party but I was actually just too anxious to walk in alone.",
    "I sent a risky text to my crush and then immediately turned my phone off and went outside for {num} minutes to calm down.",
    "I told my parents my internship at {company} was 'going great' when I've mostly just been organizing spreadsheets in silence.",
    "I've had a 'do it tomorrow' sticky note on my laptop for {months} months.",
]

# ----------------------------------------------------------------------
# ROAST TEMPLATES
# ----------------------------------------------------------------------
ROAST_TEMPLATES = [
    "Bro really said 'I'm built different' and then proved he's built from spare parts and bad decisions.",
    "This isn't a confession, it's a cry for help wearing a funny hat.",
    "The audacity to type this out AND hit submit. Zero self-preservation instinct detected.",
    "This is the human equivalent of a Wi-Fi router that needs to be unplugged and plugged back in.",
    "Reading this felt like watching someone parallel park for 10 minutes and still hit the curb.",
    "You didn't confess, you just narrated your own villain origin story with a smile.",
    "This is giving 'main character energy' but the plot is a Wattpad fanfic nobody asked for.",
    "The math isn't mathing, the vibes aren't vibing, and neither is your life apparently.",
    "This confession has the energy of a Windows XP shutdown sound — chaotic but oddly nostalgic.",
    "You typed this with your whole chest and that's the scariest part.",
    "Sir/ma'am this is a Wendy's and also a cry for professional help.",
    "This reads like the deleted scenes from a documentary about bad decision-making.",
    "You've officially unlocked 'certified disaster' achievement, no cap, no skip.",
    "This confession has more red flags than a Formula 1 race.",
    "You didn't just embarrass yourself, you filed the paperwork and got it notarized.",
    "This is what happens when 'main character syndrome' has zero plot armor.",
    "Somewhere, a therapist just felt a disturbance and doesn't know why.",
    "The confidence to do this and still show your face in public astounds me.",
    "This is a war crime against your own dignity and you committed it willingly.",
    "You really said 'let me self-destruct on main' and followed through.",
    "This isn't cringe, this is a full cringe symphony with a live orchestra.",
    "I've seen sitcom characters make better decisions than this, and they're written by interns.",
    "This confession belongs in a museum under 'ancient artifacts of poor judgment.'",
    "The fact that you're proud enough to submit this publicly is genuinely unhinged behavior.",
    "This reads like a warning label that came too late.",
    "You just described a personality disorder and called it 'just who I am.'",
    "This confession has main-character delusion and side-character consequences.",
    "Somebody alert the group chat, we have a new Hall of Fame inductee.",
    "This is what happens when 'it's giving' meets 'it's not giving' at the same time.",
    "You cooked, but you also burned the kitchen down doing it.",
]

VERDICTS = ["Cooked", "Burnt", "Safe", "Deceased", "Certified Menace", "Redeemed", "Chronically Online"]

ERAS = ["2010s", "2015s", "2020s", "2023", "2024", "2025", "2026"]

SHOWS = ["The Office", "Friends", "Brooklyn 99", "Stranger Things", "Money Heist", "Breaking Bad", "Suits", "Grey's Anatomy"]
COMPANIES = ["a startup", "a random tech company", "my uncle's business", "a call center", "a coffee chain", "a marketing agency"]
COURSES = ["Calculus II", "Organic Chemistry", "Data Structures", "Microeconomics", "Statistics"]
EVENTS = ["a family reunion", "a wedding", "a study group", "a work retreat", "a birthday party"]
BRANDS = ["a phone company's", "an insurance company's", "a car brand's", "a fast food chain's"]


def rand_confession():
    template = random.choice(CONFESSION_TEMPLATES)
    return template.format(
        show=random.choice(SHOWS),
        years=random.randint(1, 6),
        company=random.choice(COMPANIES),
        months=random.randint(1, 18),
        days=random.randint(1, 60),
        course=random.choice(COURSES),
        num=random.randint(2, 45),
        views=random.randint(50, 900),
        event=random.choice(EVENTS),
        brand=random.choice(BRANDS),
        ord=random.choice(["1st", "2nd", "3rd", "4th", "5th", "final"]),
    )


def rand_roast():
    return random.choice(ROAST_TEMPLATES)


def rand_name():
    if random.random() < 0.55:
        return random.choice(ANON_NAMES)
    handle = random.choice(FUNNY_HANDLES)
    return handle.format(word=random.choice(FILLER_WORDS), num=random.randint(1, 999))


def rand_target_name():
    # ~40% of confessions are "about" someone specific
    if random.random() < 0.4:
        if random.random() < 0.3:
            return random.choice(["my ex", "my roommate", "my professor", "my boss", "my group project team"])
        return fake.first_name()
    return None


def rand_created_at():
    now = datetime.now()
    delta_days = random.randint(0, 365)
    delta_seconds = random.randint(0, 86400)
    return now - timedelta(days=delta_days, seconds=delta_seconds)


def sql_escape(value):
    if value is None:
        return "NULL"
    return "'" + str(value).replace("\\", "\\\\").replace("'", "\\'") + "'"


def generate_row():
    cringe_score = random.randint(0, 100)
    # survival_probability tends to be inversely related to cringe_score, with noise
    base_survival = 100 - cringe_score
    survival_probability = max(0, min(100, base_survival + random.randint(-15, 15)))

    if cringe_score >= 80:
        verdict = random.choice(["Burnt", "Cooked", "Deceased", "Certified Menace"])
    elif cringe_score >= 50:
        verdict = random.choice(["Cooked", "Chronically Online", "Certified Menace"])
    else:
        verdict = random.choice(["Safe", "Redeemed", "Chronically Online"])

    created_at = rand_created_at()
    era = str(created_at.year) if random.random() < 0.6 else f"{(created_at.year // 10) * 10}s"

    return {
        "id": str(uuid.uuid4()),
        "name": rand_name(),
        "confession": rand_confession(),
        "cringe_score": cringe_score,
        "survival_probability": survival_probability,
        "roast": rand_roast(),
        "verdict": verdict,
        "era": era,
        "target_name": rand_target_name(),
        "created_at": created_at.strftime("%Y-%m-%d %H:%M:%S"),
    }


def main():
    columns = [
        "id", "name", "confession", "cringe_score", "survival_probability",
        "roast", "verdict", "era", "target_name", "created_at",
    ]
    col_list = ", ".join(f"`{c}`" for c in columns)

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(f"-- Auto-generated mock data for `{TABLE_NAME}`\n")
        f.write(f"-- Rows: {NUM_ROWS}\n")
        f.write("SET NAMES utf8mb4;\n\n")

        rows_written = 0
        while rows_written < NUM_ROWS:
            batch = min(BATCH_SIZE, NUM_ROWS - rows_written)
            value_lines = []
            for _ in range(batch):
                row = generate_row()
                values = [
                    sql_escape(row["id"]),
                    sql_escape(row["name"]),
                    sql_escape(row["confession"]),
                    str(row["cringe_score"]),
                    str(row["survival_probability"]),
                    sql_escape(row["roast"]),
                    sql_escape(row["verdict"]),
                    sql_escape(row["era"]),
                    sql_escape(row["target_name"]),
                    sql_escape(row["created_at"]),
                ]
                value_lines.append("(" + ", ".join(values) + ")")

            f.write(f"INSERT INTO `{TABLE_NAME}` ({col_list}) VALUES\n")
            f.write(",\n".join(value_lines))
            f.write(";\n\n")

            rows_written += batch

    print(f"Done. Wrote {NUM_ROWS} rows to {OUTPUT_FILE}")


if __name__ == "__main__":
    main()