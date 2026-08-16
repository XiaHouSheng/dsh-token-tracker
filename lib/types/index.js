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
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
import { TypertRemoteService, Remote } from '@deepseek-ai/dsh-typert-protocol';
import { DEFAULT_PRICING, beijingHour, periodOfHour, priceEntry, bucketCosts } from "./pricing.js";
import { newUsage, foldEvents, foldEvent, totalsOf, estimateMessage as localEstimate } from "./usage.js";
import { OVERVIEW_HTML } from "./page.js";
const PERSISTED_TTL = 30000;
let TokenTrackerService = (() => {
    let _classSuper = TypertRemoteService;
    let _instanceExtraInitializers = [];
    let _usageSession_decorators;
    let _usageTurn_decorators;
    let _usageDetail_decorators;
    let _usageAll_decorators;
    let _usageNow_decorators;
    let _usageUrl_decorators;
    let _setPricing_decorators;
    return class TokenTrackerService extends _classSuper {
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(_classSuper[Symbol.metadata] ?? null) : void 0;
            _usageSession_decorators = [Remote('session')];
            _usageTurn_decorators = [Remote('turn')];
            _usageDetail_decorators = [Remote('detail')];
            _usageAll_decorators = [Remote('all')];
            _usageNow_decorators = [Remote('now')];
            _usageUrl_decorators = [Remote('url')];
            _setPricing_decorators = [Remote('setPricing')];
            __esDecorate(this, null, _usageSession_decorators, { kind: "method", name: "usageSession", static: false, private: false, access: { has: obj => "usageSession" in obj, get: obj => obj.usageSession }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _usageTurn_decorators, { kind: "method", name: "usageTurn", static: false, private: false, access: { has: obj => "usageTurn" in obj, get: obj => obj.usageTurn }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _usageDetail_decorators, { kind: "method", name: "usageDetail", static: false, private: false, access: { has: obj => "usageDetail" in obj, get: obj => obj.usageDetail }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _usageAll_decorators, { kind: "method", name: "usageAll", static: false, private: false, access: { has: obj => "usageAll" in obj, get: obj => obj.usageAll }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _usageNow_decorators, { kind: "method", name: "usageNow", static: false, private: false, access: { has: obj => "usageNow" in obj, get: obj => obj.usageNow }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _usageUrl_decorators, { kind: "method", name: "usageUrl", static: false, private: false, access: { has: obj => "usageUrl" in obj, get: obj => obj.usageUrl }, metadata: _metadata }, null, _instanceExtraInitializers);
            __esDecorate(this, null, _setPricing_decorators, { kind: "method", name: "setPricing", static: false, private: false, access: { has: obj => "setPricing" in obj, get: obj => obj.setPricing }, metadata: _metadata }, null, _instanceExtraInitializers);
            if (_metadata) Object.defineProperty(this, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
        }
        static inject = ['webServer'];
        /**
         * In-memory token store. It is the single source of truth for token usage:
         *   - `session/event` folds every event into the store immediately (for any
         *     session id), regardless of whether anything has asked for it yet;
         *   - the REST/Remote APIs read ONLY this store (never rescan the whole
         *     session log on every request); a session whose events are not flowing
         *     (e.g. old archived ones) is lazily back-filled from its durable log
         *     once, then kept fresh by subsequent events.
         */
        store = (__runInitializers(this, _instanceExtraInitializers), new Map());
        pricingOverride = null;
        pricingCache = null;
        constructor(ctx) {
            super(ctx, 'tokenTracker');
            ctx.effect(() => ctx.webServer.register({
                kind: 'exact',
                path: '/dsh-token-tracker',
                handler: (req, res) => void this.serveOverviewPage(req, res),
            }), 'token-tracker: overview page');
            ctx.effect(() => ctx.webServer.register({
                kind: 'exact',
                path: '/dsh-token-tracker/api',
                handler: (req, res) => void this.serveOverviewApi(req, res),
            }), 'token-tracker: overview api');
            // Event-driven store writes: fold every event the moment it arrives. We
            // ensure an entry exists first so live/closed session data is always in the
            // store without needing a prior API call.
            ctx.on('session/event', (session, event) => {
                if (typeof session.id !== 'string')
                    return;
                let entry = this.store.get(session.id);
                if (!entry || !entry.live) {
                    entry = { seq: 0, live: true, scannedAt: Date.now(), usage: newUsage() };
                    this.store.set(session.id, entry);
                }
                foldEvent(entry.usage, event, this.estimate.bind(this));
                entry.seq += 1;
                entry.scannedAt = Date.now();
            });
        }
        // ---- estimation ---------------------------------------------------------
        estimate(message) {
            const meter = this.ctx.get('tokenMeter');
            if (meter?.estimateMessage) {
                try {
                    return meter.estimateMessage(message);
                }
                catch { /* fall through */ }
            }
            return localEstimate(message);
        }
        // ---- pricing ------------------------------------------------------------
        async candidatePaths() {
            const paths = [];
            const policy = this.ctx.get('sandboxPolicy');
            if (typeof policy?.workspaceRoot === 'string')
                paths.push(policy.workspaceRoot);
            const sessionQuery = this.ctx.get('sessionQuery');
            if (sessionQuery?.listSessions) {
                try {
                    const records = await sessionQuery.listSessions();
                    for (const rec of records) {
                        const cwd = rec.header?.cwd;
                        if (typeof cwd === 'string' && !paths.includes(cwd))
                            paths.push(cwd);
                    }
                }
                catch { /* ignore */ }
            }
            return paths;
        }
        async loadPricing() {
            const now = Date.now();
            if (this.pricingCache && now - this.pricingCache.at < 10000) {
                return { table: this.pricingCache.table, source: this.pricingCache.source };
            }
            if (this.pricingOverride !== null) {
                this.pricingCache = { at: now, table: this.pricingOverride, source: 'local' };
                return { table: this.pricingOverride, source: 'local' };
            }
            let table = DEFAULT_PRICING;
            let source = 'default';
            const fs = this.ctx.get('fs');
            if (fs?.resolve && fs.readText) {
                const paths = await this.candidatePaths();
                for (const base of paths) {
                    try {
                        const target = await fs.resolve(base + '/token-pricing.json');
                        const parsed = JSON.parse(await fs.readText(target));
                        if (parsed && typeof parsed === 'object' && parsed.models && typeof parsed.models === 'object') {
                            table = parsed;
                            source = 'file';
                            break;
                        }
                    }
                    catch { /* try next */ }
                }
            }
            this.pricingCache = { at: now, table, source };
            return { table, source };
        }
        // ---- usage --------------------------------------------------------------
        async getUsage(sessionId) {
            // The store is the source of truth and is kept fresh by `session/event`.
            // For a live session, reconcile against the in-memory session's event list
            // by count to catch anything that arrived between event writes.
            const sessions = this.ctx.get('sessions');
            let live;
            if (sessions?.get) {
                try {
                    live = sessions.get(sessionId);
                }
                catch {
                    live = undefined;
                }
            }
            const entry = this.store.get(sessionId) ?? null;
            if (live) {
                const events = Array.isArray(live.events) ? live.events : [];
                // Ensure a store entry exists for a live session.
                if (!entry) {
                    const fresh = { seq: 0, live: true, scannedAt: Date.now(), usage: newUsage() };
                    this.store.set(sessionId, fresh);
                }
                const cur = this.store.get(sessionId);
                cur.live = true;
                cur.scannedAt = Date.now();
                const from = cur.seq;
                const count = events.length;
                if (from < count) {
                    for (let i = from; i < count; i++)
                        foldEvent(cur.usage, events[i], this.estimate.bind(this));
                    cur.seq = count;
                }
                return cur;
            }
            // Persisted/archived session: serve the store's cached value if fresh, else
            // lazily back-fill it from the durable log once (subsequent requests within
            // TTL reuse the store without touching the log).
            if (entry && Date.now() - entry.scannedAt < PERSISTED_TTL)
                return entry;
            const sessionQuery = this.ctx.get('sessionQuery');
            if (!sessionQuery?.readSession)
                return entry;
            let snapshot;
            try {
                snapshot = await sessionQuery.readSession(sessionId);
            }
            catch {
                return entry;
            }
            const events = Array.isArray(snapshot?.events) ? snapshot.events : [];
            // Reliable incremental folding needs a monotonic seq per message; we don't
            // have that from the store alone, so for archived sessions fold from
            // scratch and cache the result. Live updates keep it warm via session/event.
            const usage = newUsage();
            foldEvents(usage, events, this.estimate.bind(this));
            const next = { seq: events.length, live: false, scannedAt: Date.now(), usage };
            this.store.set(sessionId, next);
            return next;
        }
        async buildOverview(pricing) {
            const sessionQuery = this.ctx.get('sessionQuery');
            let records = [];
            if (sessionQuery?.listSessions) {
                try {
                    records = await sessionQuery.listSessions();
                }
                catch {
                    records = [];
                }
            }
            const ids = [];
            for (const rec of records) {
                if (typeof rec.header?.id === 'string')
                    ids.push(rec.header.id);
                if (ids.length >= 300)
                    break;
            }
            const rows = await Promise.all(ids.map(async (id) => {
                try {
                    const entry = await this.getUsage(id);
                    return entry ? { id, entry } : null;
                }
                catch {
                    return null;
                }
            }));
            const titleMap = new Map();
            if (sessionQuery?.readTitleSnapshots && ids.length > 0) {
                try {
                    const observations = await sessionQuery.readTitleSnapshots(ids);
                    for (const obs of observations) {
                        if (obs?.status === 'fulfilled' && obs.value?.title?.title)
                            titleMap.set(obs.sessionId, obs.value.title.title);
                    }
                }
                catch { /* ignore */ }
            }
            const sessions = [];
            let totalInput = 0;
            let totalOutput = 0;
            let totalCacheRead = 0;
            let totalCacheWrite = 0;
            let totalEstimated = 0;
            let totalCost = 0;
            let totalCostCached = 0;
            let totalCostUncached = 0;
            let totalCostOutput = 0;
            let totalCostEstimated = 0;
            for (const row of rows) {
                if (!row)
                    continue;
                const totals = totalsOf(row.entry.usage, pricing.table, Date.now());
                if (totals.total === 0 && totals.turnCount === 0)
                    continue;
                const rec = records.find(r => r.header?.id === row.id);
                sessions.push({
                    sessionId: row.id,
                    title: titleMap.get(row.id) ?? '',
                    live: rec?.live === true,
                    createdAt: rec?.header?.createdAt ?? 0,
                    inputTokens: totals.inputTokens,
                    outputTokens: totals.outputTokens,
                    cacheReadTokens: totals.cacheReadTokens,
                    cacheWriteTokens: totals.cacheWriteTokens,
                    estimatedTokens: totals.estimatedTokens,
                    providerCalls: totals.providerCalls,
                    estimatedCalls: totals.estimatedCalls,
                    turnCount: totals.turnCount,
                    lastActiveAt: totals.lastActiveAt,
                    billedTotal: totals.billedTotal,
                    total: totals.total,
                    hasEstimated: totals.hasEstimated,
                    model: totals.model,
                    hitRate: totals.hitRate,
                    unpriced: totals.unpriced,
                    cost: totals.cost,
                });
                totalInput += totals.inputTokens;
                totalOutput += totals.outputTokens;
                totalCacheRead += totals.cacheReadTokens;
                totalCacheWrite += totals.cacheWriteTokens;
                totalEstimated += totals.estimatedTokens;
                totalCost += totals.cost.total;
                totalCostCached += totals.cost.cached;
                totalCostUncached += totals.cost.uncached;
                totalCostOutput += totals.cost.output;
                totalCostEstimated += totals.cost.estimated;
            }
            let currentSessionId = null;
            let bestAt = 0;
            for (const s of sessions) {
                if (s.live && s.lastActiveAt > bestAt) {
                    bestAt = s.lastActiveAt;
                    currentSessionId = s.sessionId;
                }
            }
            for (const s of sessions)
                if (s.sessionId === currentSessionId)
                    s.current = true;
            sessions.sort((a, b) => b.lastActiveAt - a.lastActiveAt || b.total - a.total);
            const nowMs = Date.now();
            return {
                generatedAt: nowMs,
                period: periodOfHour(beijingHour(nowMs), pricing.table),
                currentSessionId,
                total: {
                    sessions: sessions.length,
                    inputTokens: totalInput,
                    outputTokens: totalOutput,
                    cacheReadTokens: totalCacheRead,
                    cacheWriteTokens: totalCacheWrite,
                    estimatedTokens: totalEstimated,
                    billedTotal: totalInput + totalOutput + totalCacheRead + totalCacheWrite,
                    total: totalInput + totalOutput + totalCacheRead + totalCacheWrite + totalEstimated,
                    cost: {
                        cached: totalCostCached,
                        uncached: totalCostUncached,
                        output: totalCostOutput,
                        estimated: totalCostEstimated,
                        total: totalCost,
                        unpriced: totalCost === 0 && sessions.some(s => s.unpriced),
                    },
                },
                sessions,
            };
        }
        // ---- Remote surface ------------------------------------------------------
        async usageSession(args) {
            const pricing = await this.loadPricing();
            const entry = await this.getUsage(args.sessionId);
            if (!entry)
                return null;
            const totals = totalsOf(entry.usage, pricing.table, Date.now());
            const { perTurn: _perTurn, ...rest } = totals;
            return rest;
        }
        async usageTurn(args) {
            const pricing = await this.loadPricing();
            const entry = await this.getUsage(args.sessionId);
            if (!entry)
                return null;
            const tu = entry.usage.turns.get(args.turn);
            if (!tu)
                return null;
            return {
                turn: args.turn,
                messages: tu.messages,
                input: tu.input,
                output: tu.output,
                cacheRead: tu.cacheRead,
                cacheWrite: tu.cacheWrite,
                estimated: tu.estimated,
                billed: tu.input + tu.output + tu.cacheRead + tu.cacheWrite,
                total: tu.input + tu.output + tu.cacheRead + tu.cacheWrite + tu.estimated,
                hasEstimated: tu.estimated > 0,
                model: tu.model,
                cost: bucketCosts([...tu.buckets.values()], pricing.table, Date.now()),
            };
        }
        async usageDetail(args) {
            const pricing = await this.loadPricing();
            const entry = await this.getUsage(args.sessionId);
            if (!entry)
                return null;
            const totals = totalsOf(entry.usage, pricing.table, Date.now());
            return { sessionId: args.sessionId, ...totals };
        }
        async usageAll() {
            const pricing = await this.loadPricing();
            const overview = await this.buildOverview(pricing);
            overview.pricing = {
                source: pricing.source,
                timezone: pricing.table.timezone ?? '',
                peakHours: pricing.table.peakHours ?? [],
                models: pricing.table.models,
            };
            return overview;
        }
        async usageNow() {
            const pricing = await this.loadPricing();
            const nowMs = Date.now();
            const hour = beijingHour(nowMs);
            const models = {};
            for (const name of Object.keys(pricing.table.models)) {
                const entry = priceEntry(name, pricing.table, nowMs);
                if (entry?.prices)
                    models[name] = { prices: entry.prices };
            }
            return {
                period: periodOfHour(hour, pricing.table),
                hour,
                beijingTime: new Date(nowMs).toISOString(),
                source: pricing.source,
                models,
            };
        }
        async usageUrl() {
            const port = this.ctx.webServer.port;
            if (typeof port !== 'number' || port === 0)
                return null;
            return { url: `http://127.0.0.1:${port}/dsh-token-tracker` };
        }
        async setPricing(args) {
            const json = args.json;
            if (json === null || json === '') {
                this.pricingOverride = null;
                this.pricingCache = null;
                return { ok: true };
            }
            try {
                const parsed = JSON.parse(json);
                if (parsed && typeof parsed === 'object' && parsed.models && typeof parsed.models === 'object') {
                    this.pricingOverride = parsed;
                    this.pricingCache = null;
                    return { ok: true };
                }
                return { ok: false, error: 'invalid pricing schema: missing models' };
            }
            catch (error) {
                return { ok: false, error: error instanceof Error ? error.message : String(error) };
            }
        }
        // ---- web overview -------------------------------------------------------
        serveOverviewPage(_req, res) {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(OVERVIEW_HTML);
        }
        async serveOverviewApi(req, res) {
            const url = req.url ?? '';
            const qi = url.indexOf('?');
            const params = new Map();
            if (qi >= 0) {
                for (const part of url.slice(qi + 1).split('&')) {
                    if (!part)
                        continue;
                    const eq = part.indexOf('=');
                    const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part);
                    const value = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : '');
                    params.set(key, value);
                }
            }
            try {
                const pricing = await this.loadPricing();
                const sessionId = params.get('session');
                if (sessionId) {
                    const entry = await this.getUsage(sessionId);
                    if (!entry) {
                        this.sendJson(res, 404, { error: 'session not found' });
                        return;
                    }
                    const totals = totalsOf(entry.usage, pricing.table, Date.now());
                    this.sendJson(res, 200, { sessionId, ...totals });
                    return;
                }
                const overview = await this.buildOverview(pricing);
                overview.pricing = {
                    source: pricing.source,
                    timezone: pricing.table.timezone ?? '',
                    peakHours: pricing.table.peakHours ?? [],
                    models: pricing.table.models,
                };
                this.sendJson(res, 200, overview);
            }
            catch (error) {
                this.sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
            }
        }
        sendJson(res, status, payload) {
            let body;
            try {
                body = JSON.stringify(payload);
            }
            catch {
                body = '{"error":"serialize failed"}';
            }
            res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
            res.end(body);
        }
    };
})();
export { TokenTrackerService };
export default TokenTrackerService;
//# sourceMappingURL=index.js.map