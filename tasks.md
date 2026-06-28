# The Wall — Implementation Tasks

> Generated from codebase audit: 3 features + 2 known bugs  
> No files modified during audit. All tasks below are pending implementation.

---

## P0 — Critical (Security / User-Facing Bugs)

### [x] P0-1: Fix bootstrap race condition in AuthProvider (Completed)
- **Fixes**: Auto-logout bug, Single-session enforcement
- **Effort**: Small
- **File**: `frontend/components/AuthProvider.tsx`
- **What**: In the `onAuthStateChange` handler, when an existing session is detected and a nonce is generated, **await** `registerSession()` before starting the validation loop. This mirrors the fix already applied to the `signIn()` path (which has an explicit comment: "MUST await registration before starting the loop").
- **Why**: On page load with an existing session, `onAuthStateChange` starts the validation loop before `registerSession()` completes. The first validation check sees a stale nonce in the DB (from a previous session) and triggers a false kick. This is the most likely trigger for the auto-logout bug.

### [x] P0-2: Filter onAuthStateChange events (Implemented)
- **Fixes**: Auto-logout bug
- **Effort**: Small
- **File**: `frontend/components/AuthProvider.tsx`
- **What**: Add an event type guard in the `onAuthStateChange` callback — only run the bootstrap/register logic on `"SIGNED_IN"` and `"INITIAL_SESSION"` events. Ignore `"TOKEN_REFRESHED"`, `"PASSWORD_UPDATE"`, and other events. Token refreshes should NOT re-register the session or re-run bootstrap logic.
- **Why**: When Supabase auto-refreshes the JWT, `onAuthStateChange` fires with `"TOKEN_REFRESHED"`. This re-runs the bootstrap logic, which may re-register the session (generating a new nonce) while the old nonce is still in the DB, causing a brief self-kick.

### P0-3: Extract API URL to single source of truth + add checks
- **Fixes**: Localhost dependency bug
- **Effort**: Small
- **Files**: New file `frontend/lib/config.ts`, modify `frontend/lib/api.ts`, `frontend/app/page.tsx`, `frontend/components/AuthProvider.tsx`
- **What**:
  1. Create `frontend/lib/config.ts` that exports `API_URL` with a single fallback (or throws if unset in production).
  2. All three files import from `config.ts` instead of inlining `process.env.NEXT_PUBLIC_API_URL ?? "http://127.0.0.1:8000"`.
  3. Add a runtime check: if the API URL is `localhost` and `window.location.hostname` is not `localhost`, log a console error and show a developer-facing warning.
  4. Add a build-time check in `next.config.js` that warns if `NEXT_PUBLIC_API_URL` is not set.
- **Why**: If `NEXT_PUBLIC_API_URL` is not set on Vercel, all auth operations silently fail. The user appears logged in but single-session enforcement is completely disabled. The localhost default is hardcoded in 3 separate places.

### [x] P0-4: Eliminate grace period in validate_session() (Implemented)
- **Fixes**: Single-session enforcement bypass
- **Effort**: Small
- **File**: `backend/main.py`
- **What**: In the `validate_session()` endpoint, change the branch where `stored_nonce is None` to return 401 instead of 200. This forces the client to re-register, which it already does on bootstrap.
- **Why**: Currently, when no session exists in the DB for the user (after a DB wipe, manual row deletion, or failed upsert), `validate-session` returns valid. This means single-session is not enforced — any device with a valid JWT passes validation. The only downside is a brief kick on first page load before registration completes, but the P0-1 fix (awaiting registration) prevents this.

---

## P1 — High (Feature Integrity / Reliability)

### [ ] P1-1: Move `wall_remember_me` to sessionStorage for "don't remember" users (Pending – changes applied)
- **Fixes**: Auto-logout bug (stale flag), Remember Me integrity
- **Effort**: Small
- **Files**: `frontend/components/AuthProvider.tsx`, `frontend/lib/supabase.ts`
- **What**:
  1. In `signIn()`, store `wall_remember_me` in `sessionStorage` (not `localStorage`) when `rememberMe` is false.
  2. In `signOut()`, clear `wall_remember_me` from both `localStorage` and `sessionStorage`.
  3. In `supabase.ts` → `rememberMeStorage.getItem()`, check both `localStorage` and `sessionStorage` for the flag.
- **Why**: Currently, `wall_remember_me` is ALWAYS stored in `localStorage`, even for "don't remember" users. If a "don't remember" user closes the browser, `sessionStorage` is cleared but the flag persists in `localStorage`. On next visit, the storage adapter reads the stale flag and incorrectly uses `localStorage` for the new session, persisting tokens that should have been ephemeral.

### [ ] P1-2: Add rollback in signIn() catch block (Pending – changes applied)
- **Fixes**: Remember Me integrity
- **Effort**: Small
- **File**: `frontend/components/AuthProvider.tsx`
- **What**: If `supabase.auth.signInWithPassword()` throws, remove `wall_remember_me` from both `localStorage` and `sessionStorage` before re-throwing the error.
- **Why**: If signIn fails, the `wall_remember_me` flag remains set in `localStorage`. Next page load finds the flag and the storage adapter routes to `localStorage` instead of `sessionStorage`, corrupting the storage type for the next login attempt.

### P1-3: Remove in-memory `_active_sessions` fallback
- **Fixes**: Auto-logout bug (server restart), Single-session consistency
- **Effort**: Medium
- **File**: `backend/main.py`
- **What**:
  1. Remove the `_active_sessions: dict[str, str] = {}` dict.
  2. Remove the fallback logic in `validate_session()` that reads from `_active_sessions` when Supabase fails.
  3. Remove the mirror logic in `register_session()` that writes to `_active_sessions`.
  4. Alternative: keep the in-memory dict but **only** as a write-through cache (write to both, read from Supabase only). Don't fall back to it on read failure.
- **Why**: The in-memory dict is lost on server restart. If Supabase read also fails at that moment, the grace period kicks in and single-session is not enforced. If Supabase returns a stale row from a previous session, the current nonce won't match and the user gets falsely kicked. The in-memory dict creates inconsistency, not resilience.

### P1-4: Add nonce reconciliation on validation failure
- **Fixes**: Auto-logout resilience
- **Effort**: Medium
- **File**: `frontend/components/AuthProvider.tsx`
- **What**: In `validateSession()`, instead of immediately setting `kickedOut = true` on a 401 response, attempt to re-register the session once (call `registerSession()`) then re-validate. Only kick the user if the second validation also fails.
- **Why**: Handles the case where the server restarted and the DB row is stale. The user's nonce is still valid in their browser storage, but the DB row has an old nonce from a previous session. Re-registering updates the DB row and the next validation passes.

---

## P2 — Medium (UX / Security Hardening)

### P2-1: Add read-only banner for unauthenticated users
- **Fixes**: Protected view UX
- **Effort**: Small
- **File**: `frontend/app/page.tsx`
- **What**: Conditionally render a dismissible `ReadOnlyBanner` component at the top of the feed when `!user`. Text: "You're browsing in read-only mode. Sign in to confess and reply."
- **Why**: Currently, an unauthenticated user sees the exact same feed as an authenticated user with no indication they're in a limited mode. The only hint is the sidebar `LoginPrompt`, which is easy to miss on mobile (behind a tab).

### P2-2: Blur/truncate roast content for unauthenticated users
- **Fixes**: Protected view content gating
- **Effort**: Medium
- **Files**: `frontend/components/ConfessionCard.tsx`, `frontend/app/page.tsx`
- **What**:
  1. `ConfessionCard.tsx` accepts an `isAuthenticated` prop.
  2. If `!isAuthenticated`, show only the first 2 lines of the roast text with a "Sign in to see the full roast" CTA.
  3. `page.tsx` passes `isAuthenticated` down to `ConfessionCard`.
- **Why**: Unauthenticated users currently see full roast text, cringe scores, survival probabilities, verdicts, and eras for every confession. If the intent is a "teaser" view that encourages sign-up, none of that exists.

### P2-3: Collapse replies for unauthenticated users
- **Fixes**: Protected view content gating
- **Effort**: Small
- **File**: `frontend/components/ReplySection.tsx`
- **What**: Accept an `isAuthenticated` prop. If false, show "X replies — sign in to view" instead of the full reply list.
- **Why**: Reply viewing is fully public — only posting is gated. If "protected read-only view" means unauthenticated users should see less content, replies should be collapsed.

### P2-4: Wire up ALLOWED_ORIGINS in CORS middleware
- **Fixes**: Security (CORS)
- **Effort**: Small
- **File**: `backend/main.py`
- **What**: Change `allow_origins=["*"]` to `allow_origins=allowed_origins` (the already-parsed `ALLOWED_ORIGINS` env var). If `ALLOWED_ORIGINS` is not set, fall back to a safe default list (e.g., `["https://the-wall-fawn.vercel.app"]`) rather than wildcard.
- **Why**: `ALLOWED_ORIGINS` is parsed from the environment but never used. The CORS middleware uses `["*"]`, allowing any origin to make requests. This is a security vulnerability in production.

---

## P3 — Low (Polish / Future Improvements)

### P3-1: Reduce polling interval from 20s to 10s
- **Fixes**: Single-session enforcement window
- **Effort**: Small
- **File**: `frontend/components/AuthProvider.tsx`
- **What**: Change `setInterval(20000)` to `setInterval(10000)`. Optionally, use 5s for the first minute after login, then 10s.
- **Why**: Two devices can both appear valid for up to 20 seconds after a second login. Reducing the interval narrows this window.

### P3-2: Add storage-type reconciliation in bootstrap
- **Fixes**: Remember Me edge case
- **Effort**: Medium
- **File**: `frontend/components/AuthProvider.tsx`
- **What**: On `onAuthStateChange` with an existing session, check if tokens are in `localStorage` but `wall_remember_me` is missing or contradictory. If so, migrate tokens to the correct storage type or clear the stale flag.
- **Why**: A token in `sessionStorage` + flag in `localStorage` (or vice versa) causes the storage adapter to route incorrectly on the next operation.

### P3-3: Add WebSocket/SSE push for kick notifications
- **Fixes**: Single-session enforcement latency
- **Effort**: Large
- **Files**: `backend/main.py` (add SSE endpoint), `frontend/components/AuthProvider.tsx` (add EventSource listener)
- **What**: When a new session is registered for a user, push a `"session_kicked"` event to the old session via Server-Sent Events. The client listens for this event and immediately triggers the kick flow instead of waiting for the next poll.
- **Why**: Eliminates the polling window entirely. Currently, the first device won't know it's been kicked until the next 20s (or 10s after P3-1) validation check.

---

## Task Dependency Graph

```
P0-1 (bootstrap race) ──→ P0-4 (eliminate grace period)
     │                        │
     ▼                        ▼
P0-2 (event filter)     P1-4 (nonce reconciliation)
     │
     ▼
P1-1 (stale flag) ──→ P1-2 (signIn rollback)
     │
     ▼
P1-3 (remove in-memory)

P0-3 (API URL) — independent, can be done in parallel

P2-1 → P2-2 → P2-3 — sequential UX improvements
P2-4 — independent

P3-1, P3-2, P3-3 — independent, can be done in any order
```

---

## Feature Status Summary

| Feature | Status | Key Gaps |
|---------|--------|----------|
| Login flow with "Remember Me" | ⚠️ Partially Implemented | Stale `wall_remember_me` flag, no rollback on signIn failure, no storage reconciliation |
| Protected read-only view | ⚠️ Partially Implemented | Only the confession form sidebar is protected; entire feed is fully public with no read-only indicator |
| Single-session enforcement | ⚠️ Partially Implemented / Fragile | Grace period bypass, bootstrap race condition, in-memory inconsistency, 20s polling window |

| Bug | Status | Root Causes |
|-----|--------|-------------|
| Auto-logout | 🔴 Confirmed | Bootstrap race condition (most likely), server restart + stale DB row, stale `wall_remember_me` flag, token refresh re-bootstrap |
| Localhost dependency | 🔴 Confirmed | Hardcoded `http://127.0.0.1:8000` fallback in 3 files; silently disables auth enforcement in production |
