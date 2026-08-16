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
import type { OverviewPayload, UsageDetail, UsageTurn } from '../types.ts';
/**
 * Fetch one session's detail. Concurrent calls for the same session share one
 * request; a cached result (within TTL) is returned without a network call.
 * Pass `opts.force` to bypass the cache (used by manual refresh).
 */
export declare function fetchSession(sessionId: string, opts?: {
    force?: boolean;
}): Promise<UsageDetail | null>;
/** Force a fresh fetch of one session (bumps the cache). */
export declare function refreshSession(sessionId: string): Promise<UsageDetail | null>;
/**
 * Per-turn usage for one closed turn, derived from the session detail payload.
 * Uses the shared session cache, so it never triggers an extra full-detail
 * fetch on its own unless the detail genuinely isn't loaded yet.
 */
export declare function fetchTurn(sessionId: string, turn: number, opts?: {
    force?: boolean;
}): Promise<UsageTurn | null>;
/**
 * Fetch the full overview (sessions + totals + period + pricing). Concurrent
 * calls share one request; a cached overview (within TTL) is returned without
 * a network call. Pass `opts.force` to bypass the cache.
 */
export declare function fetchOverview(opts?: {
    force?: boolean;
}): Promise<OverviewPayload | null>;
/** Force a fresh overview (bumps the cache). Used by the "刷新" button. */
export declare function refreshOverview(): Promise<OverviewPayload | null>;
/** The standalone overview page URL. */
export declare function overviewUrl(): string;
//# sourceMappingURL=api.d.ts.map