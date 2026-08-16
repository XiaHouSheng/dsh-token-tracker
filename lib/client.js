window.__ModuleLoader__.load({
	id: "dsh-token-tracker",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		//#region \0rolldown/runtime.js
		var __create = Object.create;
		var __defProp = Object.defineProperty;
		var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
		var __getOwnPropNames = Object.getOwnPropertyNames;
		var __getProtoOf = Object.getPrototypeOf;
		var __hasOwnProp = Object.prototype.hasOwnProperty;
		var __copyProps = (to, from, except, desc) => {
			if (from && typeof from === "object" || typeof from === "function") for (var keys = __getOwnPropNames(from), i = 0, n = keys.length, key; i < n; i++) {
				key = keys[i];
				if (!__hasOwnProp.call(to, key) && key !== except) __defProp(to, key, {
					get: ((k) => from[k]).bind(null, key),
					enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable
				});
			}
			return to;
		};
		var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule || !__hasOwnProp.call(mod, "default") ? __defProp(target, "default", {
			value: mod,
			enumerable: true
		}) : target, mod));
		//#endregion
		let react = require("react");
		react = __toESM(react, 1);
		//#region src/client/style.ts
		/** Built-in GUI styles (global .dtt-* classes so the localStorage overrides keep working). */
		const BUILTIN_CSS = `
.dtt-token,.dtt-dock,.dtt-turn,.dtt-period,.dtt-open,.dtt-est,.dtt-view{box-sizing:border-box}
.dtt-token{display:inline-flex;align-items:center;gap:5px;font-size:12px;color:var(--dsw-alias-label-secondary,#cfd3d6);font-variant-numeric:tabular-nums;white-space:nowrap;letter-spacing:.2px;margin-right:4px}
.dtt-dock{color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:12px;line-height:1.5;padding:6px 0 10px}
.dtt-dock b{color:var(--dsw-alias-label-primary,#f9fafb);font-weight:600}
.dtt-turn{color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:11px;margin-top:4px;display:flex;align-items:center;gap:5px}
.dtt-period{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:600;padding:2px 10px;border-radius:999px;white-space:nowrap;margin-right:8px}
.dtt-peak{color:var(--dsw-alias-state-warn-primary,#f59e0b);background:rgba(245,158,11,.12)}
.dtt-offpeak{color:var(--dsw-alias-state-success-primary,#22c55e);background:rgba(34,197,94,.12)}
.dtt-open{display:inline-flex;align-items:center;justify-content:center;min-width:96px;height:32px;padding:6px 12px;gap:5px;border:1px solid var(--dsw-alias-border-l2,#3a3a3d);border-radius:18px;color:var(--dsw-alias-label-primary,#f9fafb);background:transparent;font-size:13px;font-weight:400;line-height:20px;cursor:pointer;text-decoration:none;white-space:nowrap;margin-right:8px}
.dtt-open:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(255,255,255,.08))}
.dtt-open span{flex:none}
.dtt-est{color:var(--dsw-alias-state-warn-primary,#f59e0b)}
.dtt-view{padding:16px 20px;font-size:13px;color:var(--dsw-alias-label-primary,#f9fafb);overflow:auto}
.dtt-view-head{display:flex;align-items:center;gap:12px;margin-bottom:14px;flex-wrap:wrap}
.dtt-view-sum{color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:12.5px;white-space:nowrap}
.dtt-view-btn{background:var(--dsw-alias-bg-layer-1,#232324);color:var(--dsw-alias-label-primary,#f9fafb);border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:5px 12px;font-size:12.5px;cursor:pointer}
.dtt-view-btn:hover{background:rgba(255,255,255,.08)}
.dtt-view-table{width:100%;border-collapse:collapse;font-size:12.5px}
.dtt-view-table th{text-align:left;padding:8px 10px;color:var(--dsw-alias-label-secondary,#cfd3d6);font-weight:500;border-bottom:1px solid rgba(255,255,255,.06);position:sticky;top:0;background:var(--dsw-alias-bg-base,#151517)}
.dtt-view-table td{padding:8px 10px;border-bottom:1px solid rgba(255,255,255,.06);white-space:nowrap}
.dtt-view-table td.num,.dtt-view-table th.num{text-align:right;font-variant-numeric:tabular-nums}
.dtt-view-row{cursor:pointer}
.dtt-view-row:hover td{background:rgba(255,255,255,.04)}
.dtt-view-row.cur td{background:rgba(125,140,255,.07)}
.dtt-view-title{max-width:300px;overflow:hidden;text-overflow:ellipsis}
.dtt-view-cur{display:inline-block;font-size:10px;color:#7d8cff;border:1px solid rgba(125,140,255,.4);border-radius:999px;padding:0 6px;margin-left:6px;vertical-align:1px}
.dtt-view-money{color:#7d8cff}
.dtt-view-est{color:var(--dsw-alias-state-warn-primary,#f59e0b)}
.dtt-cells{display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:8px;max-height:320px;overflow-y:auto;padding:6px 2px}
.dtt-cell{background:var(--dsw-alias-bg-layer-2,#2c2c2e);border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:8px 10px;font-size:12px}
.dtt-cell .c-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.dtt-cell .c-head b{font-size:12px}
.dtt-cell .c-model{color:var(--dsw-alias-label-secondary,#cfd3d6);font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dtt-cell .c-nums{color:var(--dsw-alias-label-primary,#f9fafb);font-variant-numeric:tabular-nums}
.dtt-cell .c-sub{color:var(--dsw-alias-label-secondary,#cfd3d6);margin-top:2px}
.dtt-view-empty{padding:40px 0;text-align:center;color:var(--dsw-alias-label-secondary,#cfd3d6)}
.dtt-view-loading{padding:40px 0;text-align:center;color:var(--dsw-alias-label-secondary,#cfd3d6)}
`;
		//#endregion
		//#region src/client/api.ts
		const API = "/dsh-token-tracker/api";
		const SESSION_TTL = 15e3;
		const OVERVIEW_TTL = 1e4;
		const pendingSession = /* @__PURE__ */ new Map();
		const cachedSession = /* @__PURE__ */ new Map();
		let pendingOverview = null;
		let cachedOverview = null;
		async function plainFetch(url) {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`token-tracker api ${res.status}`);
			return await res.json();
		}
		function fresh(at, ttl) {
			return Date.now() - at < ttl;
		}
		/**
		* Fetch one session's detail. Concurrent calls for the same session share one
		* request; a cached result (within TTL) is returned without a network call.
		* Pass `opts.force` to bypass the cache (used by manual refresh).
		*/
		function fetchSession(sessionId, opts) {
			const force = opts?.force === true;
			if (!force) {
				const cached = cachedSession.get(sessionId);
				if (cached && fresh(cached.at, SESSION_TTL)) return Promise.resolve(cached.data);
			}
			const existing = force ? void 0 : pendingSession.get(sessionId);
			if (existing) return existing;
			const run = plainFetch(`${API}?session=${encodeURIComponent(sessionId)}`).then((data) => {
				cachedSession.set(sessionId, {
					at: Date.now(),
					data
				});
				return data;
			}).finally(() => pendingSession.delete(sessionId));
			pendingSession.set(sessionId, run);
			return run;
		}
		/**
		* Per-turn usage for one closed turn, derived from the session detail payload.
		* Uses the shared session cache, so it never triggers an extra full-detail
		* fetch on its own unless the detail genuinely isn't loaded yet.
		*/
		async function fetchTurn(sessionId, turn, opts) {
			return ((await fetchSession(sessionId, opts))?.perTurn ?? []).find((t) => t.turn === turn) ?? null;
		}
		/**
		* Fetch the full overview (sessions + totals + period + pricing). Concurrent
		* calls share one request; a cached overview (within TTL) is returned without
		* a network call. Pass `opts.force` to bypass the cache.
		*/
		function fetchOverview(opts) {
			if (!(opts?.force === true)) {
				if (cachedOverview && fresh(cachedOverview.at, OVERVIEW_TTL)) return Promise.resolve(cachedOverview.data);
				if (pendingOverview) return pendingOverview;
			}
			const run = plainFetch(API).then((data) => {
				cachedOverview = {
					at: Date.now(),
					data
				};
				return data;
			}).finally(() => {
				pendingOverview = null;
			});
			pendingOverview = run;
			return run;
		}
		/** Force a fresh overview (bumps the cache). Used by the "刷新" button. */
		function refreshOverview() {
			if (cachedOverview) cachedOverview = null;
			return fetchOverview({ force: true });
		}
		/** The standalone overview page URL. */
		function overviewUrl() {
			return "/dsh-token-tracker";
		}
		//#endregion
		//#region src/client/components.tsx
		/** Browser components: header badge, period tag, Tracker button, dock line, turn tail, and the injected conversation view. */
		function fmt(n) {
			n = Math.round(n || 0);
			if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
			if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
			return String(n);
		}
		function fmtFull(n) {
			try {
				return Math.round(n || 0).toLocaleString();
			} catch {
				return String(n || 0);
			}
		}
		function fmtAmt(n) {
			n = Number(n) || 0;
			if (n === 0) return "0";
			if (n < .01) return n.toFixed(4);
			return n.toFixed(2);
		}
		function fmtMoney(n) {
			return "￥" + fmtAmt(n);
		}
		function timeAgo(ms) {
			if (!ms) return "—";
			const d = Date.now() - ms;
			if (d < 6e4) return "刚刚";
			if (d < 36e5) return Math.floor(d / 6e4) + " 分钟前";
			if (d < 864e5) return Math.floor(d / 36e5) + " 小时前";
			return Math.floor(d / 864e5) + " 天前";
		}
		function LineIcon({ size }) {
			const s = size ?? 12;
			return react.default.createElement("svg", {
				viewBox: "0 0 16 16",
				width: s,
				height: s,
				fill: "none",
				"aria-hidden": true,
				style: { flex: "none" }
			}, react.default.createElement("polyline", {
				points: "1.5 12.5 4.5 8.5 7.5 10.5 11 5.5 14.5 3",
				stroke: "currentColor",
				strokeWidth: "1.6",
				strokeLinecap: "round",
				strokeLinejoin: "round"
			}), react.default.createElement("circle", {
				cx: "14.5",
				cy: "3",
				r: "1.1",
				fill: "currentColor"
			}));
		}
		function sameUsage(a, b) {
			if (!a || !b) return false;
			return a.total === b.total && a.inputTokens === b.inputTokens && a.outputTokens === b.outputTokens && a.cacheReadTokens === b.cacheReadTokens && a.cacheWriteTokens === b.cacheWriteTokens && a.estimatedTokens === b.estimatedTokens && a.turnCount === b.turnCount && a.model === b.model && a.cost.total === b.cost.total;
		}
		function useSessionUsage(sessionId, useSession) {
			const [data, setData] = react.default.useState(null);
			const turnEnds = useSession ? useSession((s) => s.turnEnds.size) : 0;
			react.default.useEffect(() => {
				if (!sessionId) return;
				let alive = true;
				fetchSession(sessionId).then((value) => {
					if (alive && value) setData((prev) => sameUsage(prev, value) ? prev : value);
				}).catch(() => {});
				return () => {
					alive = false;
				};
			}, [sessionId, turnEnds]);
			return data;
		}
		function PeriodBadge() {
			const [info, setInfo] = react.default.useState(null);
			react.default.useEffect(() => {
				let alive = true;
				fetchOverview().then((overview) => {
					if (alive && overview) setInfo((prev) => prev && prev.period === overview.period ? prev : {
						period: overview.period,
						overview
					});
				}).catch(() => {});
				const timer = window.setInterval(() => {
					fetchOverview().then((overview) => {
						if (alive && overview) setInfo((prev) => prev && prev.period === overview.period ? prev : {
							period: overview.period,
							overview
						});
					}).catch(() => {});
				}, 3e5);
				return () => {
					alive = false;
					window.clearInterval(timer);
				};
			}, []);
			if (!info) return null;
			const peak = info.period === "peak";
			const pricing = info.overview.pricing;
			const lines = [peak ? "高峰时段" : "空闲时段"];
			for (const name of Object.keys(pricing?.models ?? {})) {
				const entry = (pricing?.models ?? {})[name];
				const prices = (Array.isArray(entry) && entry.length > 0 ? entry[0] : null)?.prices;
				if (!prices) continue;
				const cached = prices.inputCached?.[info.period] ?? "—";
				const uncached = prices.inputUncached?.[info.period] ?? "—";
				const output = prices.output?.[info.period] ?? "—";
				lines.push(`${name}：命中 ￥${cached}/M · 未命中 ￥${uncached}/M · 输出 ￥${output}/M`);
			}
			return react.default.createElement("span", {
				className: "dtt-period " + (peak ? "dtt-peak" : "dtt-offpeak"),
				title: lines.join("\n")
			}, `● ${peak ? "高峰" : "空闲"}`);
		}
		function OpenOverview() {
			const url = overviewUrl();
			if (!url) return null;
			return react.default.createElement("a", {
				className: "dtt-open",
				href: url,
				target: "_blank",
				rel: "noreferrer",
				title: "打开 Token 总览页面（全屏）"
			}, react.default.createElement(LineIcon, { size: 13 }), react.default.createElement("span", null, "Tracker"));
		}
		function SessionTotal(props) {
			const data = useSessionUsage(props.sessionId, props.useSession);
			if (!data || data.billedTotal === 0 && data.estimatedTokens === 0) return null;
			const label = (data.hasEstimated ? "≈" : "") + fmt(data.total);
			const costText = data.cost.total > 0 ? ` · ￥：${fmtAmt(data.cost.total)}` : "";
			const title = `本会话总消耗 ${fmtFull(data.total)} tokens（输入 ${fmtFull(data.inputTokens)} / 输出 ${fmtFull(data.outputTokens)} / 缓存 ${fmtFull(data.cacheReadTokens + data.cacheWriteTokens)}` + (data.hasEstimated ? ` / 估算 ${fmtFull(data.estimatedTokens)}` : "") + ` / 费用 ￥${fmtAmt(data.cost.total)}）`;
			return react.default.createElement("span", {
				className: "dtt-token",
				title
			}, react.default.createElement(LineIcon, { size: 13 }), `TOKEN：${label}${costText}`);
		}
		function DockTokens(props) {
			const data = useSessionUsage(props.sessionId, props.useSession);
			if (!data || data.billedTotal === 0 && data.estimatedTokens === 0) return null;
			const parts = [];
			parts.push(react.default.createElement("span", null, "本会话消耗 "));
			parts.push(react.default.createElement("b", null, (data.hasEstimated ? "≈" : "") + fmt(data.total) + " tokens"));
			if (data.cost.total > 0) {
				parts.push(react.default.createElement("span", null, " · 费用 "));
				parts.push(react.default.createElement("b", null, fmtMoney(data.cost.total)));
			}
			parts.push(react.default.createElement("span", null, ` · 输入 ${fmt(data.inputTokens)}`));
			parts.push(react.default.createElement("span", null, ` · 输出 ${fmt(data.outputTokens)}`));
			const cache = data.cacheReadTokens + data.cacheWriteTokens;
			if (cache > 0) parts.push(react.default.createElement("span", null, ` · 缓存 ${fmt(cache)}`));
			if (data.hasEstimated) parts.push(react.default.createElement("span", { className: "dtt-est" }, ` · 估算 ${fmt(data.estimatedTokens)}`));
			if (data.model) parts.push(react.default.createElement("span", null, ` · ${data.model}`));
			return react.default.createElement("div", { className: "dtt-dock" }, parts);
		}
		function TurnTokens(props) {
			const sessionId = props.sessionId;
			const turn = props.matched.turn;
			const [data, setData] = react.default.useState(null);
			const requested = react.default.useRef(/* @__PURE__ */ new Set());
			react.default.useEffect(() => {
				if (!sessionId || turn === void 0) return;
				const key = `${sessionId}|${turn}`;
				if (requested.current.has(key)) return;
				requested.current.add(key);
				let alive = true;
				fetchTurn(sessionId, turn).then((value) => {
					if (alive) setData(value);
				}).catch(() => {});
				return () => {
					alive = false;
				};
			}, [sessionId, turn]);
			if (!data || data.messages === 0) return null;
			const title = `回合 #${data.turn}：输入 ${fmtFull(data.input)} / 输出 ${fmtFull(data.output)}` + (data.cacheRead + data.cacheWrite > 0 ? ` / 缓存 ${fmtFull(data.cacheRead + data.cacheWrite)}` : "") + (data.hasEstimated ? ` / 估算 ${fmtFull(data.estimated)}` : "") + ` / 费用 ${fmtMoney(data.cost.total)}` + (data.model ? ` / 模型 ${data.model}` : "");
			const label = (data.hasEstimated ? "≈" : "") + fmt(data.total) + " tokens" + (data.cost.total > 0 ? ` · ${fmtMoney(data.cost.total)}` : "");
			return react.default.createElement("div", {
				className: "dtt-turn",
				title
			}, react.default.createElement(LineIcon, { size: 11 }), react.default.createElement("span", null, label));
		}
		function TokenView(props) {
			const sessionId = props.sessionId;
			const turnEnds = props.useSession ? props.useSession((s) => s.turnEnds.size) : 0;
			const [data, setData] = react.default.useState(null);
			const [expandedId, setExpandedId] = react.default.useState(null);
			const [detail, setDetail] = react.default.useState(null);
			const refresh = () => {
				refreshOverview().then((value) => {
					if (value) setData(value);
				}).catch(() => {});
			};
			react.default.useEffect(() => {
				if (!sessionId) return;
				let alive = true;
				fetchOverview().then((value) => {
					if (alive && value) setData(value);
				}).catch(() => {});
				return () => {
					alive = false;
				};
			}, [sessionId, turnEnds]);
			const toggleDetail = (id) => {
				if (expandedId === id) {
					setExpandedId(null);
					setDetail(null);
					return;
				}
				setExpandedId(id);
				setDetail(null);
				fetchSession(id).then((value) => {
					if (value) setDetail(value);
				}).catch(() => {});
			};
			if (!data) return react.default.createElement("div", { className: "dtt-view" }, react.default.createElement("div", { className: "dtt-view-loading" }, "加载中…"));
			const peak = data.period === "peak";
			const t = data.total;
			const head = react.default.createElement("div", { className: "dtt-view-head" }, react.default.createElement("span", { className: "dtt-period " + (peak ? "dtt-peak" : "dtt-offpeak") }, `● ${peak ? "高峰" : "空闲"}`), react.default.createElement("span", { className: "dtt-view-sum" }, `会话 ${t.sessions} · 总消耗 ${fmt(t.total)} · 费用 ${fmtMoney(t.cost.total)}`), react.default.createElement("span", { style: { flex: 1 } }), react.default.createElement("button", {
				type: "button",
				className: "dtt-view-btn",
				onClick: refresh
			}, "刷新"));
			const rows = [];
			for (const s of data.sessions) {
				const costTxt = s.cost.total > 0 ? fmtMoney(s.cost.total) : s.unpriced ? "未计价" : "￥0";
				rows.push(react.default.createElement("tr", {
					key: s.sessionId,
					className: "dtt-view-row" + (s.current ? " cur" : "") + (expandedId === s.sessionId ? " open" : ""),
					onClick: () => toggleDetail(s.sessionId)
				}, react.default.createElement("td", {
					className: "dtt-view-title",
					title: s.sessionId
				}, s.title || "(无标题)", s.current ? react.default.createElement("span", { className: "dtt-view-cur" }, "当前") : null), react.default.createElement("td", { className: "num" }, s.turnCount), react.default.createElement("td", {
					className: "num",
					title: fmtFull(s.inputTokens)
				}, fmt(s.inputTokens)), react.default.createElement("td", {
					className: "num",
					title: fmtFull(s.outputTokens)
				}, fmt(s.outputTokens)), react.default.createElement("td", {
					className: "num",
					title: fmtFull(s.cacheReadTokens + s.cacheWriteTokens)
				}, fmt(s.cacheReadTokens + s.cacheWriteTokens)), react.default.createElement("td", {
					className: "num dtt-view-est",
					title: fmtFull(s.estimatedTokens)
				}, s.estimatedTokens ? fmt(s.estimatedTokens) : "—"), react.default.createElement("td", {
					className: "num dtt-view-money",
					title: `命中 ${fmtMoney(s.cost.cached)} / 未命中 ${fmtMoney(s.cost.uncached)} / 输出 ${fmtMoney(s.cost.output)}`
				}, costTxt), react.default.createElement("td", { className: "num" }, timeAgo(s.lastActiveAt))));
				if (expandedId === s.sessionId) {
					let body;
					if (detail) {
						const cells = (detail.perTurn ?? []).map((p) => react.default.createElement("div", {
							key: p.turn,
							className: "dtt-cell",
							title: `命中 ${fmtMoney(p.cost.cached)} / 未命中 ${fmtMoney(p.cost.uncached)} / 输出 ${fmtMoney(p.cost.output)}`
						}, react.default.createElement("div", { className: "c-head" }, react.default.createElement("b", null, `#${p.turn}`), react.default.createElement("span", { className: "c-model" }, p.model || "—")), react.default.createElement("div", { className: "c-nums" }, `${(p.hasEstimated ? "≈" : "") + fmt(p.total)} tokens · ${p.cost.total > 0 ? fmtMoney(p.cost.total) : "￥0"}`), react.default.createElement("div", { className: "c-sub" }, `入 ${fmt(p.input)} · 出 ${fmt(p.output)} · 缓存 ${fmt(p.cacheRead + p.cacheWrite)}${p.estimated ? ` · 估 ${fmt(p.estimated)}` : ""}`)));
						body = detail.perTurn && detail.perTurn.length > 0 ? react.default.createElement("div", { className: "dtt-cells" }, cells) : react.default.createElement("div", { className: "dtt-view-loading" }, "无回合数据");
					} else body = react.default.createElement("div", { className: "dtt-view-loading" }, "加载中…");
					rows.push(react.default.createElement("tr", { key: s.sessionId + "-d" }, react.default.createElement("td", { colSpan: 8 }, body)));
				}
			}
			const table = rows.length > 0 ? react.default.createElement("table", { className: "dtt-view-table" }, react.default.createElement("thead", null, react.default.createElement("tr", null, react.default.createElement("th", null, "标题"), react.default.createElement("th", { className: "num" }, "轮次"), react.default.createElement("th", { className: "num" }, "输入"), react.default.createElement("th", { className: "num" }, "输出"), react.default.createElement("th", { className: "num" }, "缓存"), react.default.createElement("th", { className: "num" }, "估算"), react.default.createElement("th", { className: "num" }, "费用"), react.default.createElement("th", { className: "num" }, "最后活动"))), react.default.createElement("tbody", null, rows)) : react.default.createElement("div", { className: "dtt-view-empty" }, "暂无消耗数据");
			return react.default.createElement("div", { className: "dtt-view" }, head, table);
		}
		//#endregion
		//#region src/client/index.ts
		const inject = ["slots"];
		function apply(ctx) {
			const styleTag = document.createElement("style");
			styleTag.dataset.plugin = "@deepseek-ai/dsh-token-tracker";
			styleTag.textContent = BUILTIN_CSS;
			document.head.appendChild(styleTag);
			ctx.effect(() => () => styleTag.remove());
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "dtt-period",
				order: -1
			}, PeriodBadge));
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "dtt-header",
				order: -.5
			}, SessionTotal));
			ctx.slots.inject("conversation.session.header.utilities", () => ctx.slots.register({
				name: "conversation.session.header.utilities",
				id: "dtt-open",
				order: 1
			}, OpenOverview));
			ctx.slots.inject("conversation.composer.dock", () => ctx.slots.register({
				name: "conversation.composer.dock",
				id: "dtt-dock",
				order: 1
			}, DockTokens));
			ctx.slots.inject("conversation.chat.turnTail", () => ctx.slots.register({
				name: "conversation.chat.turnTail",
				select: (owner) => {
					if (owner.turn.status !== "closed") return null;
					return { turn: owner.turn.turn };
				}
			}, TurnTokens));
			ctx.slots.inject("conversation.view", () => ctx.slots.register({
				name: "conversation.view",
				id: "token-tracker",
				order: 20,
				label: "Token"
			}, TokenView));
		}
		//#endregion
		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});

//# sourceMappingURL=client.js.map