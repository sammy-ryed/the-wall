// ─────────────────────────────────────────────────────────────────
// API client — all calls to the FastAPI backend.
// NEXT_PUBLIC_API_URL defaults to localhost for dev;
// set it to your EC2 IP/domain for production.
// ─────────────────────────────────────────────────────────────────

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────

export interface RoastResponse {
  cringe_score: number;
  survival_probability: number;
  roast: string;
  verdict: string;
  era: string;
}

export interface Confession {
  id: string;
  name: string;
  confession: string;
  cringe_score: number;
  survival_probability: number;
  roast: string;
  verdict: string;
  era: string;
  timestamp: string;
}

export interface ConfessionsResponse {
  confessions: Confession[];
  total: number;
  page: number;
  per_page: number;
}

export interface WallStats {
  total_confessions: number;
  avg_cringe: number;
  lowest_survival: number;
  most_common_era: string;
  anon_percent: number;
}

export interface TickerResponse {
  text: string;
}

// ── Helpers ───────────────────────────────────────────────────────

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} returned ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Endpoints ─────────────────────────────────────────────────────

/**
 * POST /roast
 * Step 1 — send confession, receive roast. Does NOT publish to the wall.
 */
export async function roastConfession(confession: string): Promise<RoastResponse> {
  return apiFetch<RoastResponse>("/roast", {
    method: "POST",
    body: JSON.stringify({ confession }),
  });
}

/**
 * POST /confessions
 * Step 2 — publish a roasted confession to the wall.
 */
export async function postConfession(payload: {
  name: string;
  confession: string;
  cringe_score: number;
  survival_probability: number;
  roast: string;
  verdict: string;
  era: string;
}): Promise<Confession> {
  return apiFetch<Confession>("/confessions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

/**
 * GET /confessions?sort=new|cringe&page=1&per_page=20
 */
export async function listConfessions(
  sort: "new" | "cringe" = "new",
  page = 1,
  perPage = 20
): Promise<ConfessionsResponse> {
  return apiFetch<ConfessionsResponse>(
    `/confessions?sort=${sort}&page=${page}&per_page=${perPage}`
  );
}

/**
 * GET /confessions/leaderboard?limit=3
 * Hall of Shame — top N by cringe score.
 */
export async function getLeaderboard(limit = 3): Promise<Confession[]> {
  return apiFetch<Confession[]>(`/confessions/leaderboard?limit=${limit}`);
}

/**
 * GET /stats
 */
export async function getStats(): Promise<WallStats> {
  return apiFetch<WallStats>("/stats");
}

/**
 * GET /ticker
 */
export async function getTicker(): Promise<TickerResponse> {
  return apiFetch<TickerResponse>("/ticker");
}

/**
 * GET /health
 */
export async function healthCheck(): Promise<{ status: string }> {
  return apiFetch<{ status: string }>("/health");
}
