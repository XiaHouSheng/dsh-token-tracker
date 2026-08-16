/**
 * Usage folding over the durable session log. Each `assistant/message` event
 * carries provider-reported `usage` when the adapter reported token accounting;
 * missing usage falls back to a heuristic estimate. Messages are attributed to
 * the model named by the latest `request/header` and to the Beijing hour of
 * their event time, so cost can be computed per model/period later.
 */
import type { SessionEvent } from '@deepseek-ai/dsh-session/types';
import type { PricingTable } from './types.ts';
import { bucketCosts, type CostBucket } from './pricing.ts';
export interface TurnUsage {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    estimated: number;
    messages: number;
    model: string;
    buckets: Map<string, CostBucket>;
}
export interface UsageState {
    input: number;
    output: number;
    cacheRead: number;
    cacheWrite: number;
    estimated: number;
    calls: number;
    estimatedCalls: number;
    turnStarts: number;
    lastAt: number;
    currentModel: string;
    turns: Map<number, TurnUsage>;
}
export declare function newUsage(): UsageState;
export declare function estimateContent(blocks: unknown): number;
export declare function estimateMessage(message: unknown): number;
export declare function foldEvent(usage: UsageState, event: SessionEvent, estimate: (message: unknown) => number): void;
export declare function foldEvents(usage: UsageState, events: readonly SessionEvent[], estimate: (message: unknown) => number): void;
export declare function totalsOf(usage: UsageState, table: PricingTable, nowMs: number): {
    inputTokens: number;
    outputTokens: number;
    cacheReadTokens: number;
    cacheWriteTokens: number;
    estimatedTokens: number;
    providerCalls: number;
    estimatedCalls: number;
    turnCount: number;
    turnStarts: number;
    lastActiveAt: number;
    billedTotal: number;
    total: number;
    hasEstimated: boolean;
    model: string;
    hitRate: number;
    unpriced: boolean;
    cost: {
        cached: number;
        uncached: number;
        output: number;
        estimated: number;
        total: number;
        unpriced: boolean;
    };
    perTurn: {
        turn: number;
        messages: number;
        input: number;
        output: number;
        cacheRead: number;
        cacheWrite: number;
        estimated: number;
        billed: number;
        total: number;
        hasEstimated: boolean;
        model: string;
        cost: ReturnType<typeof bucketCosts>;
    }[];
};
//# sourceMappingURL=usage.d.ts.map