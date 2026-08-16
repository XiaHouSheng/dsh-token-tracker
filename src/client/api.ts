/** Browser fetchers for the token-tracker host JSON API. */

import type { OverviewPayload, UsageDetail, UsageTurn } from '../types.ts'

const API = '/dsh-token-tracker/api'

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`token-tracker api ${res.status}`)
  return await res.json() as T
}

/** Full overview: sessions, totals, period, and pricing. */
export function fetchOverview(): Promise<OverviewPayload> {
  return getJson<OverviewPayload>(API)
}

/** Totals (and per-turn breakdown) for one session. */
export function fetchSession(sessionId: string): Promise<UsageDetail> {
  return getJson<UsageDetail>(`${API}?session=${encodeURIComponent(sessionId)}`)
}

/**
 * Per-turn usage for one closed turn, derived from the session detail payload.
 */
export async function fetchTurn(sessionId: string, turn: number): Promise<UsageTurn | null> {
  const detail = await fetchSession(sessionId)
  const found = (detail.perTurn ?? []).find(t => t.turn === turn)
  return found ?? null
}

/** The standalone overview page URL. */
export function overviewUrl(): string {
  return '/dsh-token-tracker'
}
