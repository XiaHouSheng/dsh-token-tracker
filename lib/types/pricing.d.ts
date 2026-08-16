/**
 * Peak/off-peak pricing engine. Prices are CNY per 1M tokens; periods are
 * Beijing time (UTC+8). A model maps to the price entry whose effectiveFrom is
 * the latest one not after `now` (falling back to the earliest entry so
 * pre-effective history still estimates).
 */
import type { PricingTable, PricingEntry } from './types.ts';
export declare const DEFAULT_PRICING: PricingTable;
export declare function beijingHour(ms: number): number;
export declare function periodOfHour(hour: number, table: PricingTable): 'peak' | 'offpeak';
export declare function priceEntry(model: string, table: PricingTable, nowMs: number): PricingEntry | undefined;
export declare function priceOf(entry: PricingEntry | undefined, period: 'peak' | 'offpeak', key: 'inputCached' | 'inputUncached' | 'output'): number | undefined;
export interface CostBucket {
    model: string;
    hour: number;
    input: number;
    cacheRead: number;
    cacheWrite: number;
    output: number;
    estimated: number;
}
export declare function bucketCosts(buckets: readonly CostBucket[], table: PricingTable, nowMs: number): {
    cached: number;
    uncached: number;
    output: number;
    estimated: number;
    total: number;
    unpriced: boolean;
};
//# sourceMappingURL=pricing.d.ts.map