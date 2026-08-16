/**
 * Peak/off-peak pricing engine. Prices are CNY per 1M tokens; periods are
 * Beijing time (UTC+8). A model maps to the price entry whose effectiveFrom is
 * the latest one not after `now` (falling back to the earliest entry so
 * pre-effective history still estimates).
 */
export const DEFAULT_PRICING = {
    timezone: 'Asia/Shanghai (UTC+8)',
    peakHours: [
        { start: 9, end: 12 },
        { start: 14, end: 18 },
    ],
    models: {
        'deepseek-v4-flash': [{
                effectiveFrom: '2026-08-17T00:00:00+08:00',
                note: '峰谷定价：高峰 = 空闲 × 2',
                prices: {
                    inputCached: { offpeak: 0.05, peak: 0.10 },
                    inputUncached: { offpeak: 1.5, peak: 3.0 },
                    output: { offpeak: 4.5, peak: 9.0 },
                },
            }],
        'deepseek-v4-pro': [{
                effectiveFrom: '2026-08-17T00:00:00+08:00',
                note: '峰谷定价：高峰 = 空闲 × 2',
                prices: {
                    inputCached: { offpeak: 0.15, peak: 0.30 },
                    inputUncached: { offpeak: 4.5, peak: 9.0 },
                    output: { offpeak: 13.5, peak: 27.0 },
                },
            }],
    },
};
export function beijingHour(ms) {
    const d = new Date(ms);
    return (d.getUTCHours() + 8) % 24;
}
export function periodOfHour(hour, table) {
    const peaks = Array.isArray(table.peakHours) ? table.peakHours : [];
    for (const p of peaks) {
        if (typeof p.start === 'number' && typeof p.end === 'number' && hour >= p.start && hour < p.end)
            return 'peak';
    }
    return 'offpeak';
}
export function priceEntry(model, table, nowMs) {
    const list = table.models[model];
    if (!Array.isArray(list) || list.length === 0)
        return undefined;
    let chosen = list[0];
    let best = -Infinity;
    for (const entry of list) {
        const from = typeof entry.effectiveFrom === 'string' ? Date.parse(entry.effectiveFrom) : NaN;
        if (!Number.isNaN(from) && from <= nowMs && from > best) {
            chosen = entry;
            best = from;
        }
    }
    if (best === -Infinity) {
        let earliestFrom = Infinity;
        for (const entry of list) {
            const from = typeof entry.effectiveFrom === 'string' ? Date.parse(entry.effectiveFrom) : Infinity;
            if (from < earliestFrom) {
                earliestFrom = from;
                chosen = entry;
            }
        }
    }
    return chosen;
}
export function priceOf(entry, period, key) {
    const value = entry?.prices?.[key];
    if (value && typeof value === 'object' && typeof value[period] === 'number')
        return value[period];
    return undefined;
}
export function bucketCosts(buckets, table, nowMs) {
    let cached = 0;
    let uncached = 0;
    let output = 0;
    let estimated = 0;
    let unpriced = false;
    for (const bk of buckets) {
        const entry = priceEntry(bk.model, table, nowMs);
        if (entry === undefined)
            unpriced = true;
        const period = periodOfHour(bk.hour, table);
        const pCached = priceOf(entry, period, 'inputCached');
        const pUncached = priceOf(entry, period, 'inputUncached');
        const pOutput = priceOf(entry, period, 'output');
        cached += bk.cacheRead * (pCached ?? 0) / 1e6;
        uncached += (bk.input + bk.cacheWrite) * (pUncached ?? 0) / 1e6;
        output += bk.output * (pOutput ?? 0) / 1e6;
        estimated += bk.estimated * (pUncached ?? 0) / 1e6;
    }
    return { cached, uncached, output, estimated, total: cached + uncached + output + estimated, unpriced };
}
//# sourceMappingURL=pricing.js.map