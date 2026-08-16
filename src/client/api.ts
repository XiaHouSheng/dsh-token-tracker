/**
 * Browser fetchers for the token-tracker host JSON API.
 *
 * To avoid a self-DoS (many components polling the same endpoints at the same
 * time), every fetch is routed through a tiny module-level cache + in-flight
 * dedup layer:
 *   - concurrent calls for the same key share ONE request (dedup);
 *   - recent results are served from cache so repeated mounts/change-flares
 *     don't hit the host every time.
 */

import type { OverviewPayload, UsageDetail, UsageTurn } from '../types.ts'

const API = '/dsh-token-tracker/api'

const SESSION_TTL = 15000   // ms before a session detail is refetched
const OVERVIEW_TTL = 10000  // ms before an overview is refetched

// ---- shared cache store ----------------------------------------------------

const pendingSession = new Map<string, Promise<UsageDetail | null>>()
const cachedSession = new Map<string, { at: number; data: UsageDetail | null }>()
let pendingOverview: Promise<OverviewPayload | null> | null = null
let cachedOverview: { at: number; data: OverviewPayload | null } | null = null

async function plainFetch<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`token-tracker api ${res.status}`)
  return await res.json() as T
}

function fresh(at: number, ttl: number): boolean {
  return Date.now() - at < ttl
}

// ---- session detail --------------------------------------------------------

/**
 * Fetch one session's detail. Concurrent calls for the same session share one
 * request; a cached result (within TTL) is returned without a network call.
 * Pass `opts.force` to bypass the cache (used by manual refresh).
 */
export function fetchSession(sessionId: string, opts?: { force?: boolean }): Promise<UsageDetail | null> {
  const force = opts?.force === true
  if (!force) {
    const cached = cachedSession.get(sessionId)
    if (cached && fresh(cached.at, SESSION_TTL)) return Promise.resolve(cached.data)
  }
  const existing = force ? undefined : pendingSession.get(sessionId)
  if (existing) return existing
  const run = plainFetch<UsageDetail>(`${API}?session=${encodeURIComponent(sessionId)}`)
    .then((data) => {
      cachedSession.set(sessionId, { at: Date.now(), data })
      return data
    })
    .finally(() => pendingSession.delete(sessionId))
  pendingSession.set(sessionId, run)
  return run
}

/** Force a fresh fetch of one session (bumps the cache). */
export function refreshSession(sessionId: string): Promise<UsageDetail | null> {
  if (cachedSession.has(sessionId)) cachedSession.delete(sessionId)
  return fetchSession(sessionId, { force: true })
}

/**
 * Per-turn usage for one closed turn, derived from the session detail payload.
 * Uses the shared session cache, so it never triggers an extra full-detail
 * fetch on its own unless the detail genuinely isn't loaded yet.
 */
export async function fetchTurn(sessionId: string, turn: number, opts?: { force?: boolean }): Promise<UsageTurn | null> {
  const detail = await fetchSession(sessionId, opts)
  const found = (detail?.perTurn ?? []).find(t => t.turn === turn)
  return found ?? null
}

// ---- overview --------------------------------------------------------------

/**
 * Fetch the full overview (sessions + totals + period + pricing). Concurrent
 * calls share one request; a cached overview (within TTL) is returned without
 * a network call. Pass `opts.force` to bypass the cache.
 */
export function fetchOverview(opts?: { force?: boolean }): Promise<OverviewPayload | null> {
  const force = opts?.force === true
  if (!force) {
    if (cachedOverview && fresh(cachedOverview.at, OVERVIEW_TTL)) {
      return Promise.resolve(cachedOverview.data)
    }
    if (pendingOverview) return pendingOverview
  }
  const run = plainFetch<OverviewPayload>(API)
    .then((data) => {
      cachedOverview = { at: Date.now(), data }
      return data
    })
    .finally(() => { pendingOverview = null })
  pendingOverview = run
  return run
}

/** Force a fresh overview (bumps the cache). Used by the "刷新" button. */
export function refreshOverview(): Promise<OverviewPayload | null> {
  if (cachedOverview) cachedOverview = null
  return fetchOverview({ force: true })
}

/** The standalone overview page URL. */
export function overviewUrl(): string {
  return '/dsh-token-tracker'
}
