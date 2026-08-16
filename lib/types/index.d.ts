/**
 * Host half of the Token Tracker: folds provider token usage from the durable
 * session log, prices it with the peak/off-peak table (browser override →
 * token-pricing.json → built-in default), serves the standalone overview page
 * and JSON API, and exposes the `tokenTracker` Remote surface the browser
 * plugin calls.
 *
 * Mounted as one row in the web-app bundle; the browser half rides the same
 * package's `dsh.client` manifest.
 */
import { TypertRemoteService } from '@deepseek-ai/dsh-typert-protocol';
import type { Context } from '@deepseek-ai/cordis';
import type { OverviewPayload, PeriodInfo, UsageDetail, UsageTotals, UsageTurn } from './types.ts';
declare module '@deepseek-ai/cordis' {
    interface Context {
        tokenTracker: TokenTrackerService;
    }
}
export declare class TokenTrackerService extends TypertRemoteService {
    static inject: string[];
    /**
     * In-memory token store. It is the single source of truth for token usage:
     *   - `session/event` folds every event into the store immediately (for any
     *     session id), regardless of whether anything has asked for it yet;
     *   - the REST/Remote APIs read ONLY this store (never rescan the whole
     *     session log on every request); a session whose events are not flowing
     *     (e.g. old archived ones) is lazily back-filled from its durable log
     *     once, then kept fresh by subsequent events.
     */
    private readonly store;
    private pricingOverride;
    private pricingCache;
    constructor(ctx: Context);
    private estimate;
    private candidatePaths;
    private loadPricing;
    private getUsage;
    private buildOverview;
    usageSession(args: {
        sessionId: string;
    }): Promise<UsageTotals | null>;
    usageTurn(args: {
        sessionId: string;
        turn: number;
    }): Promise<UsageTurn | null>;
    usageDetail(args: {
        sessionId: string;
    }): Promise<UsageDetail | null>;
    usageAll(): Promise<OverviewPayload>;
    usageNow(): Promise<PeriodInfo>;
    usageUrl(): Promise<{
        url: string;
    } | null>;
    setPricing(args: {
        json: string | null;
    }): Promise<{
        ok: boolean;
        error?: string;
    }>;
    private serveOverviewPage;
    private serveOverviewApi;
    private sendJson;
}
export default TokenTrackerService;
//# sourceMappingURL=index.d.ts.map