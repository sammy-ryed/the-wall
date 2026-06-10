// ─────────────────────────────────────────────────────────────────
// API client — all calls to the FastAPI backend.
// NEXT_PUBLIC_API_URL defaults to localhost for dev;
// set it to your EC2 domain for production.
// ─────────────────────────────────────────────────────────────────

const BASE = (process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000").replace(/\/$/, "");

// ── Types ─────────────────────────────────────────────────────────

export interface RoastResponse {
  cringe_score: number;
  survival_probability: number;
  roast: string;
  verdict: string;
  era: string;
  target_name?: string | null;
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
  timestamp: string; // ISO 8601 from backend
  target_name?: string | null;
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

async function apiFetch<T>(
  path: string,
  options?: RequestInit,
  token?: string
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options?.headers as Record<string, string> ?? {}),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${path} returned ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

// ── Timestamp formatter ───────────────────────────────────────────

/**
 * Formats an ISO timestamp into a human-readable relative or absolute string.
 * e.g. "just now", "5m ago", "3h ago", "Jun 10, 11:30 PM"
 */
export function formatTimestamp(iso: string): string {
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return iso; // if it's already a string like "3h ago"
    const now = Date.now();
    const diff = now - date.getTime();
    const secs = Math.floor(diff / 1000);
    if (secs < 60) return "just now";
    const mins = Math.floor(secs / 60);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return iso;
  }
}

// ── Endpoints ─────────────────────────────────────────────────────

/**
 * POST /roast
 * Step 1 — send confession, receive roast. Does NOT publish to the wall.
 * Requires auth token for verified users.
 */
export async function roastConfession(
  confession: string,
  token?: string
): Promise<RoastResponse> {
  return apiFetch<RoastResponse>(
    "/roast",
    { method: "POST", body: JSON.stringify({ confession }) },
    token
  );
}

/**
 * POST /confessions
 * Step 2 — publish a roasted confession to the wall.
 * Requires auth token.
 */
export async function postConfession(
  payload: {
    name: string;
    confession: string;
    cringe_score: number;
    survival_probability: number;
    roast: string;
    verdict: string;
    era: string;
    target_name?: string | null;
  },
  token?: string
): Promise<Confession> {
  return apiFetch<Confession>(
    "/confessions",
    { method: "POST", body: JSON.stringify(payload) },
    token
  );
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
