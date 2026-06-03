# The Wall — Anonymous Confession & Roast Machine

Confess your coding crimes anonymously. Get roasted by Claude AI. No mercy, no take-backs.

**Stack**: FastAPI (Python) · Next.js 14 (TypeScript, Tailwind) · Anthropic Claude API

---

## Folder Structure

```
baba yaga/
├── backend/          FastAPI app
│   ├── main.py       API routes + in-memory store
│   ├── roast.py      Claude API integration
│   ├── models.py     Pydantic schemas
│   ├── requirements.txt
│   └── .env.example
├── frontend/         Next.js 14 app
│   ├── app/
│   ├── components/
│   ├── lib/api.ts    ← all API calls live here
│   └── .env.local.example
└── README.md
```

---

## Backend Setup

```bash
cd backend

# 1. Create virtual environment
python -m venv venv

# Windows
.\venv\Scripts\Activate.ps1
# macOS/Linux
source venv/bin/activate

# 2. Install dependencies
pip install -r requirements.txt

# 3. Configure environment
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

# 4. Run the server
uvicorn main:app --reload --port 8000
```

### API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET`  | `/health` | Health check (for AWS load balancers) |
| `POST` | `/roast` | Get a roast for a confession (step 1) |
| `POST` | `/confessions` | Publish a roasted confession to the wall (step 2) |
| `GET`  | `/confessions` | List confessions (`?sort=new\|cringe&page=1`) |
| `GET`  | `/confessions/leaderboard` | Top N by cringe score (`?limit=3`) |
| `GET`  | `/stats` | Live wall-wide stats |
| `GET`  | `/ticker` | Live ticker text from recent confessions |

### Test the API

```powershell
# Step 1: Get a roast
Invoke-RestMethod -Uri http://127.0.0.1:8000/roast `
  -Method Post -ContentType "application/json" `
  -Body '{"confession": "I pushed to prod on Friday and turned off my phone."}'

# Step 2: Publish it
Invoke-RestMethod -Uri http://127.0.0.1:8000/confessions `
  -Method Post -ContentType "application/json" `
  -Body '{"name":"Rahul","confession":"...","cringe_score":97,"survival_probability":4,"roast":"...","verdict":"Chaos agent","era":"Post-accountability arc"}'

# Stats
Invoke-RestMethod -Uri http://127.0.0.1:8000/stats

# Leaderboard
Invoke-RestMethod -Uri http://127.0.0.1:8000/confessions/leaderboard
```

---

## Frontend Setup

```bash
cd frontend

# 1. Install dependencies
npm install

# 2. Configure API URL
cp .env.local.example .env.local
# For local dev, default (http://127.0.0.1:8000) works as-is

# 3. Run dev server
npm run dev
# Open http://localhost:3000
```

---

## Getting Your ANTHROPIC_API_KEY

1. Go to [console.anthropic.com](https://console.anthropic.com/)
2. Sign up / log in
3. Navigate to **API Keys** → **Create Key**
4. Copy the key (starts with `sk-ant-...`)
5. Add it to `backend/.env`:
   ```
   ANTHROPIC_API_KEY=sk-ant-api03-your-key-here
   ```

> **No key?** The backend falls back to a smart rule-based local roast generator — the app is fully usable without one.

---

## Deploying Backend to AWS EC2 t3.micro

```bash
# On your EC2 instance (Amazon Linux 2 / Ubuntu):
git clone <your-repo>
cd backend

python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Create .env
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env
echo "ALLOWED_ORIGINS=http://localhost:3000,http://YOUR_EC2_IP" >> .env

# Run with uvicorn on port 8000 (open port 8000 in security group)
uvicorn main:app --host 0.0.0.0 --port 8000

# Or use screen/tmux for persistence:
screen -S wall
uvicorn main:app --host 0.0.0.0 --port 8000
# Ctrl+A D to detach
```

### Frontend → EC2 connection

```bash
# In frontend/.env.local:
NEXT_PUBLIC_API_URL=http://YOUR_EC2_PUBLIC_IP:8000
```

> ⚠️ **EC2 Security Group**: Open inbound port `8000` (TCP) from `0.0.0.0/0` (or your IP).
> For production, put Nginx in front of uvicorn and use HTTPS.

---

## Notes

- **No database** — confessions are stored in memory. Restarting the server resets the wall (re-seeds the 8 canonical confessions). For persistence, swap the list with a SQLite or DynamoDB store.
- The t3.micro has 1GB RAM — more than enough for the in-memory store up to ~10,000 confessions.
