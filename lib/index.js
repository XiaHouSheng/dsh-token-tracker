import { Remote, TypertRemoteService } from "@deepseek-ai/dsh-typert-protocol";
//#region ../src/pricing.ts
const DEFAULT_PRICING = {
	timezone: "Asia/Shanghai (UTC+8)",
	peakHours: [{
		start: 9,
		end: 12
	}, {
		start: 14,
		end: 18
	}],
	models: {
		"deepseek-v4-flash": [{
			effectiveFrom: "2026-08-17T00:00:00+08:00",
			note: "峰谷定价：高峰 = 空闲 × 2",
			prices: {
				inputCached: {
					offpeak: .05,
					peak: .1
				},
				inputUncached: {
					offpeak: 1.5,
					peak: 3
				},
				output: {
					offpeak: 4.5,
					peak: 9
				}
			}
		}],
		"deepseek-v4-pro": [{
			effectiveFrom: "2026-08-17T00:00:00+08:00",
			note: "峰谷定价：高峰 = 空闲 × 2",
			prices: {
				inputCached: {
					offpeak: .15,
					peak: .3
				},
				inputUncached: {
					offpeak: 4.5,
					peak: 9
				},
				output: {
					offpeak: 13.5,
					peak: 27
				}
			}
		}]
	}
};
function beijingHour(ms) {
	return (new Date(ms).getUTCHours() + 8) % 24;
}
function periodOfHour(hour, table) {
	const peaks = Array.isArray(table.peakHours) ? table.peakHours : [];
	for (const p of peaks) if (typeof p.start === "number" && typeof p.end === "number" && hour >= p.start && hour < p.end) return "peak";
	return "offpeak";
}
function priceEntry(model, table, nowMs) {
	const list = table.models[model];
	if (!Array.isArray(list) || list.length === 0) return void 0;
	let chosen = list[0];
	let best = -Infinity;
	for (const entry of list) {
		const from = typeof entry.effectiveFrom === "string" ? Date.parse(entry.effectiveFrom) : NaN;
		if (!Number.isNaN(from) && from <= nowMs && from > best) {
			chosen = entry;
			best = from;
		}
	}
	if (best === -Infinity) {
		let earliestFrom = Infinity;
		for (const entry of list) {
			const from = typeof entry.effectiveFrom === "string" ? Date.parse(entry.effectiveFrom) : Infinity;
			if (from < earliestFrom) {
				earliestFrom = from;
				chosen = entry;
			}
		}
	}
	return chosen;
}
function priceOf(entry, period, key) {
	const value = entry?.prices?.[key];
	if (value && typeof value === "object" && typeof value[period] === "number") return value[period];
}
function bucketCosts(buckets, table, nowMs) {
	let cached = 0;
	let uncached = 0;
	let output = 0;
	let estimated = 0;
	let unpriced = false;
	for (const bk of buckets) {
		const entry = priceEntry(bk.model, table, nowMs);
		if (entry === void 0) unpriced = true;
		const period = periodOfHour(bk.hour, table);
		const pCached = priceOf(entry, period, "inputCached");
		const pUncached = priceOf(entry, period, "inputUncached");
		const pOutput = priceOf(entry, period, "output");
		cached += bk.cacheRead * (pCached ?? 0) / 1e6;
		uncached += (bk.input + bk.cacheWrite) * (pUncached ?? 0) / 1e6;
		output += bk.output * (pOutput ?? 0) / 1e6;
		estimated += bk.estimated * (pUncached ?? 0) / 1e6;
	}
	return {
		cached,
		uncached,
		output,
		estimated,
		total: cached + uncached + output + estimated,
		unpriced
	};
}
//#endregion
//#region ../src/usage.ts
function newUsage() {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		estimated: 0,
		calls: 0,
		estimatedCalls: 0,
		turnStarts: 0,
		lastAt: 0,
		currentModel: "",
		turns: /* @__PURE__ */ new Map()
	};
}
function estimateContent(blocks) {
	const CHARS_PER_TOKEN = 4;
	const BLOCK_OVERHEAD = 4;
	if (!Array.isArray(blocks)) return 0;
	let tokens = 0;
	for (const raw of blocks) {
		const block = raw;
		if (block === null || typeof block !== "object") {
			tokens += BLOCK_OVERHEAD;
			continue;
		}
		if (block.type === "text" || block.type === "reasoning") tokens += Math.ceil(String(block.text ?? "").length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD;
		else if (block.type === "tool-call") tokens += Math.ceil(String(block.name ?? "").length / CHARS_PER_TOKEN) + Math.ceil(String(block.arguments ?? "").length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD;
		else if (block.type === "tool-result") tokens += estimateContent(block.content) + BLOCK_OVERHEAD;
		else {
			let size = 0;
			try {
				size = JSON.stringify(block).length;
			} catch {
				size = 0;
			}
			tokens += BLOCK_OVERHEAD + Math.ceil(size / CHARS_PER_TOKEN);
		}
	}
	return tokens;
}
function estimateMessage(message) {
	if (!message || typeof message !== "object") return 0;
	return estimateContent(message.content) + 4;
}
function foldEvent(usage, event, estimate) {
	if (typeof event.time === "number" && event.time > usage.lastAt) usage.lastAt = event.time;
	if (event.type === "turn/start") {
		usage.turnStarts += 1;
		return;
	}
	if (event.type === "request/header") {
		const header = event.data?.header;
		if (typeof header?.config?.model === "string") usage.currentModel = header.config.model;
		return;
	}
	if (event.type !== "assistant/message") return;
	const data = event.data;
	if (!data || typeof data !== "object") return;
	const turn = typeof data.turn === "number" ? data.turn : 0;
	let tu = usage.turns.get(turn);
	if (!tu) {
		tu = {
			input: 0,
			output: 0,
			cacheRead: 0,
			cacheWrite: 0,
			estimated: 0,
			messages: 0,
			model: "",
			buckets: /* @__PURE__ */ new Map()
		};
		usage.turns.set(turn, tu);
	}
	tu.messages += 1;
	if (usage.currentModel !== "") tu.model = usage.currentModel;
	const hour = beijingHour(typeof event.time === "number" ? event.time : Date.now());
	const key = usage.currentModel + "|" + hour;
	let bucket = tu.buckets.get(key);
	if (!bucket) {
		bucket = {
			model: usage.currentModel,
			hour,
			input: 0,
			cacheRead: 0,
			cacheWrite: 0,
			output: 0,
			estimated: 0
		};
		tu.buckets.set(key, bucket);
	}
	const u = data.usage;
	if (u && typeof u === "object") {
		const input = typeof u.inputTokens === "number" ? u.inputTokens : 0;
		const output = typeof u.outputTokens === "number" ? u.outputTokens : 0;
		const cacheRead = typeof u.cacheReadTokens === "number" ? u.cacheReadTokens : 0;
		const cacheWrite = typeof u.cacheWriteTokens === "number" ? u.cacheWriteTokens : 0;
		usage.input += input;
		usage.output += output;
		usage.cacheRead += cacheRead;
		usage.cacheWrite += cacheWrite;
		usage.calls += 1;
		tu.input += input;
		tu.output += output;
		tu.cacheRead += cacheRead;
		tu.cacheWrite += cacheWrite;
		bucket.input += input;
		bucket.output += output;
		bucket.cacheRead += cacheRead;
		bucket.cacheWrite += cacheWrite;
	} else {
		const est = estimate(data.message);
		usage.estimated += est;
		usage.estimatedCalls += 1;
		tu.estimated += est;
		bucket.estimated += est;
	}
}
function foldEvents(usage, events, estimate) {
	for (const event of events) foldEvent(usage, event, estimate);
}
function totalsOf(usage, table, nowMs) {
	const billed = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
	const perTurn = [];
	let costCached = 0;
	let costUncached = 0;
	let costOutput = 0;
	let costEstimated = 0;
	let unpriced = false;
	for (const [turn, tu] of usage.turns) {
		const cost = bucketCosts([...tu.buckets.values()], table, nowMs);
		if (cost.unpriced) unpriced = true;
		costCached += cost.cached;
		costUncached += cost.uncached;
		costOutput += cost.output;
		costEstimated += cost.estimated;
		perTurn.push({
			turn,
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
			cost
		});
	}
	perTurn.sort((a, b) => a.turn - b.turn);
	const totalInput = usage.input + usage.cacheRead + usage.cacheWrite;
	const hitRate = totalInput > 0 ? usage.cacheRead / totalInput : 0;
	return {
		inputTokens: usage.input,
		outputTokens: usage.output,
		cacheReadTokens: usage.cacheRead,
		cacheWriteTokens: usage.cacheWrite,
		estimatedTokens: usage.estimated,
		providerCalls: usage.calls,
		estimatedCalls: usage.estimatedCalls,
		turnCount: usage.turns.size,
		turnStarts: usage.turnStarts,
		lastActiveAt: usage.lastAt,
		billedTotal: billed,
		total: billed + usage.estimated,
		hasEstimated: usage.estimated > 0,
		model: usage.currentModel,
		hitRate,
		unpriced,
		cost: {
			cached: costCached,
			uncached: costUncached,
			output: costOutput,
			estimated: costEstimated,
			total: costCached + costUncached + costOutput + costEstimated,
			unpriced
		},
		perTurn
	};
}
//#endregion
//#region ../src/page.ts
/** Standalone overview page: summary cards, session table with expandable per-turn cells, pricing table, and the localStorage-backed config panel. */
const OVERVIEW_HTML = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Token Tracker 总览</title>
<style>
:root{color-scheme:dark}
*{box-sizing:border-box}
[hidden]{display:none !important}
body{margin:0;font-family:ui-sans-serif,system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif;background:#151517;color:#f9fafb}
.wrap{max-width:1100px;margin:0 auto;padding:24px 20px 80px}
header{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:24px}
h1{font-size:18px;margin:0;font-weight:600}
.muted{color:#cfd3d6;font-size:13px}
.periodTag{font-size:12px;font-weight:600;padding:3px 10px;border-radius:999px}
.periodTag.peak{color:#f59e0b;background:rgba(245,158,11,.12)}
.periodTag.offpeak{color:#22c55e;background:rgba(34,197,94,.12)}
.cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:0 0 24px}
.card{background:#232324;border:1px solid rgba(255,255,255,.06);border-radius:12px;padding:14px 16px}
.card .k{font-size:12px;color:#cfd3d6;margin-top:4px}
.card .k:first-child{margin-top:0}
.card .v{font-size:20px;font-weight:600;margin-top:2px;font-variant-numeric:tabular-nums}
.card .v.money{color:#7d8cff}
.current{display:flex;align-items:center;gap:16px;flex-wrap:wrap;background:#1c1d1f;border:1px solid rgba(125,140,255,.28);border-radius:12px;padding:12px 16px;margin:0 0 20px}
.current .ck{font-size:12px;font-weight:600;color:#7d8cff;white-space:nowrap}
.current .ct{font-size:14px;font-weight:600;flex:1;min-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.current .cv{font-size:15px;font-weight:700;font-variant-numeric:tabular-nums;white-space:nowrap}
.current .cu{font-size:12px;color:#cfd3d6;white-space:nowrap}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:9px 10px;border-bottom:1px solid rgba(255,255,255,.06);white-space:nowrap}
th{color:#cfd3d6;font-weight:500;position:sticky;top:0;background:#151517}
td.num,th.num{text-align:right;font-variant-numeric:tabular-nums}
tr.row{cursor:pointer}tr.row:hover td{background:rgba(255,255,255,.04)}
tr.row.currentRow td{background:rgba(125,140,255,.07)}
.title{max-width:320px;overflow:hidden;text-overflow:ellipsis}
.curTag{display:inline-block;font-size:10px;color:#7d8cff;border:1px solid rgba(125,140,255,.4);border-radius:999px;padding:0 6px;margin-left:6px;vertical-align:1px}
.est{color:#f59e0b}.live{color:#22c55e;font-size:11px}
.money{color:#7d8cff}
.detail{display:none}.detail.open{display:table-row}
.detail td{padding:10px}
.cells{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:8px;max-height:300px;overflow-y:auto;padding:2px}
.cell{background:#2c2c2e;border:1px solid rgba(255,255,255,.06);border-radius:10px;padding:8px 10px;font-size:12px}
.c-head{display:flex;align-items:center;gap:8px;margin-bottom:4px}
.c-head b{font-size:12px}
.c-model{color:#cfd3d6;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.c-nums{color:#f9fafb;font-variant-numeric:tabular-nums}
.c-sub{color:#cfd3d6;margin-top:2px}
.btn{background:#232324;color:#f9fafb;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer}
.btn:hover{background:rgba(255,255,255,.08)}
.btn.primary{background:#4d6bfe;border-color:#4d6bfe;color:#fff}
.btn.primary:hover{background:#5e7bff}
.empty{color:#cfd3d6;text-align:center;padding:40px 0}
.chev{color:#cfd3d6;display:inline-block;width:14px}
.pricing{margin-top:48px;padding-top:24px;border-top:1px solid rgba(255,255,255,.06)}
.pricing h2{font-size:15px;margin:0 0 12px;font-weight:600}
.pricing .muted{font-weight:400;font-size:12px}
.overlay{position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
.cfgPanel{width:860px;max-width:100%;max-height:86vh;display:flex;flex-direction:column;background:#1c1c1e;border:1px solid rgba(255,255,255,.12);border-radius:14px;padding:18px 20px}
.cfgHead{display:flex;align-items:center;gap:12px;margin-bottom:12px}
.cfgHead h2{font-size:16px;margin:0;font-weight:600}
.tabs{display:flex;gap:8px;margin-bottom:12px}
.tab{background:#232324;color:#cfd3d6;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:6px 14px;font-size:13px;cursor:pointer}
.tab:hover{background:rgba(255,255,255,.08)}
.tab.active{background:#2c2c2e;color:#f9fafb;border-color:#4d6bfe}
.cfgEditor{width:100%;flex:1;min-height:280px;background:#151517;color:#e6e8ec;border:1px solid rgba(255,255,255,.1);border-radius:10px;padding:12px 14px;font-family:ui-monospace,SFMono-Regular,Consolas,"Courier New",monospace;font-size:12.5px;line-height:1.6;resize:none;white-space:pre;tab-size:2}
.cfgEditor:focus{outline:none;border-color:#4d6bfe}
.cfgFoot{display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap}
.cfgNote{font-size:12px;color:#cfd3d6}
.status{font-size:13px;color:#22c55e}
.status.err{color:#f87171}
</style>
</head>
<body>
<div class="wrap">
<header>
<h1>⚡ Token Tracker</h1>
<span class="periodTag" id="periodTag" hidden></span>
<span class="muted" id="updated">加载中…</span>
<span style="flex:1"></span>
<button class="btn" id="cfgOpen">⚙ 配置</button>
<button class="btn" id="refresh">刷新</button>
</header>
<div class="current" id="current" hidden>
<span class="ck">当前会话</span>
<span class="ct" id="currentTitle"></span>
<span class="cv" id="currentTokens"></span>
<span class="cv money" id="currentCost"></span>
<span class="cu" id="currentUpdated"></span>
</div>
<div class="cards" id="cards"></div>
<table><thead><tr><th style="width:22px"></th><th>标题</th><th class="num">轮次</th><th class="num">输入</th><th class="num">输出</th><th class="num">缓存</th><th class="num">估算</th><th class="num">总计</th><th class="num">费用</th><th class="num">最后活动</th></tr></thead><tbody id="body"></tbody></table>
<div class="empty" id="empty" hidden>暂无会话数据</div>
<div class="pricing">
<h2>计价表 <span class="muted" id="pricingNote"></span></h2>
<table><thead><tr><th>模型</th><th>时段</th><th class="num">缓存命中 ¥/M</th><th class="num">缓存未命中 ¥/M</th><th class="num">输出 ¥/M</th></tr></thead><tbody id="priceBody"></tbody></table>
</div>
</div>
<div class="overlay" id="cfgOverlay" hidden>
<div class="cfgPanel">
<div class="cfgHead">
<h2>⚙ 配置</h2>
<span class="status" id="cfgStatus"></span>
<span style="flex:1"></span>
<button class="btn" id="cfgClose">关闭</button>
</div>
<div class="tabs" id="cfgTabs">
<button class="tab active" data-key="pricing">计价表</button>
<button class="tab" data-key="css">GUI 样式</button>
<button class="tab" data-key="page-css">总览页样式</button>
</div>
<textarea class="cfgEditor" id="cfgEditor" spellcheck="false"></textarea>
<div class="cfgFoot">
<button class="btn primary" id="cfgSave">保存</button>
<button class="btn" id="cfgReset">恢复默认</button>
<span class="cfgNote" id="cfgNote"></span>
</div>
</div>
</div>
<script>
(function(){
var API='/dsh-token-tracker/api';
var LS_PRICING='dsh-token-tracker.pricing',LS_CSS='dsh-token-tracker.css',LS_PAGE='dsh-token-tracker.page-css';
function esc(s){return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;')}
function fmt(n){n=Math.round(n||0);if(n>=1000000)return (n/1000000).toFixed(1)+'M';if(n>=1000)return (n/1000).toFixed(1)+'k';return String(n)}
function fmtFull(n){return (n||0).toLocaleString()}
function fmtAmt(n){n=Number(n)||0;if(n===0)return '0';if(n<0.01)return n.toFixed(4);return n.toFixed(2)}
function fmtMoney(n){return '￥'+fmtAmt(n)}
function pct(n){return (Math.round((n||0)*10000)/100)+'%'}
function timeAgo(ms){if(!ms)return '—';var d=Date.now()-ms;if(d<60000)return '刚刚';if(d<3600000)return Math.floor(d/60000)+' 分钟前';if(d<86400000)return Math.floor(d/3600000)+' 小时前';return Math.floor(d/86400000)+' 天前'}
function lsGet(k){try{return localStorage.getItem(k)}catch(e){return null}}
function lsSet(k,v){try{if(v===null){localStorage.removeItem(k)}else{localStorage.setItem(k,v)}return true}catch(e){return false}}
function applyPageCss(){var old=document.getElementById('dtt-page-ext');if(old)old.remove();var css=lsGet(LS_PAGE);if(!css)return;var s=document.createElement('style');s.id='dtt-page-ext';s.textContent=css;document.head.appendChild(s)}
applyPageCss();
var detailCache={};
function loadDetail(id,cb,force){
var hit=detailCache[id];
if(!force&&hit&&Date.now()-hit.at<15000){cb(hit.data);return}
fetch(API+'?session='+encodeURIComponent(id)).then(function(r){return r.ok?r.json():null}).then(function(d){if(d&&d.perTurn)detailCache[id]={at:Date.now(),data:d};cb(d)}).catch(function(){cb(hit?hit.data:null)})
}
var bodyEl=document.getElementById('body'),updatedEl=document.getElementById('updated'),cardsEl=document.getElementById('cards'),emptyEl=document.getElementById('empty');
var curEl=document.getElementById('current'),curTitle=document.getElementById('currentTitle'),curTokens=document.getElementById('currentTokens'),curCost=document.getElementById('currentCost'),curUpdated=document.getElementById('currentUpdated');
var priceBody=document.getElementById('priceBody'),pricingNote=document.getElementById('pricingNote'),periodTag=document.getElementById('periodTag');
var overlay=document.getElementById('cfgOverlay'),editor=document.getElementById('cfgEditor'),cfgStatus=document.getElementById('cfgStatus'),cfgNote=document.getElementById('cfgNote'),cfgTabs=document.getElementById('cfgTabs');
var cfgKey='pricing',expanded={},lastKey=null;
var CFG_NOTES={'pricing':'保存到浏览器 localStorage；GUI 会同步给计价引擎，约 5 秒后费用重算；模型键名 = 会话中的 model 字段；价格单位 元/百万tokens','css':'GUI 样式（TOKEN 徽章 / Tracker 按钮 / 时段标签 / 明细行）；保存后约 5 秒自动生效','page-css':'本页面样式（配色 / 卡片 / 表格 / 展开网格）；保存后立即生效'};
function renderPeriod(p){if(!p){periodTag.hidden=true;return}periodTag.hidden=false;periodTag.textContent='● '+(p==='peak'?'高峰时段':'空闲时段');periodTag.className='periodTag '+(p==='peak'?'peak':'offpeak')}
function renderCurrent(s){
if(!s){curEl.hidden=true;return}
curEl.hidden=false;
curTitle.textContent=s.title||'(无标题)';
curTokens.textContent='TOKEN：'+(s.hasEstimated?'≈':'')+fmt(s.total);
curCost.textContent='费用 ￥'+fmtAmt(s.cost.total);
curUpdated.textContent='更新于 '+timeAgo(s.lastActiveAt)+' · '+s.model+' · 命中率 '+pct(s.hitRate);
}
function renderPricing(p){
if(!p){return}
pricingNote.textContent='来源：'+(p.source==='local'?'浏览器配置':(p.source==='file'?'token-pricing.json':'内置默认'))+' · 生效：2026-08-17 00:00（北京时间） · 高峰时段：'+p.peakHours.map(function(x){return x.start+'-'+x.end}).join(' / ');
var rows=[];
for(var model in p.models){if(!Object.prototype.hasOwnProperty.call(p.models,model))continue;var list=p.models[model]||[];for(var i=0;i<list.length;i++){var e=list[i]||{};var pr=e.prices||{};rows.push(['<tr><td>'+esc(model)+(list.length>1?' <span class="muted">('+esc(e.effectiveFrom||'')+')</span>':'')+'</td><td>空闲</td><td class="num">'+(pr.inputCached&&pr.inputCached.offpeak!==undefined?pr.inputCached.offpeak:'—')+'</td><td class="num">'+(pr.inputUncached&&pr.inputUncached.offpeak!==undefined?pr.inputUncached.offpeak:'—')+'</td><td class="num">'+(pr.output&&pr.output.offpeak!==undefined?pr.output.offpeak:'—')+'</td></tr>','<tr><td></td><td>高峰</td><td class="num">'+(pr.inputCached&&pr.inputCached.peak!==undefined?pr.inputCached.peak:'—')+'</td><td class="num">'+(pr.inputUncached&&pr.inputUncached.peak!==undefined?pr.inputUncached.peak:'—')+'</td><td class="num">'+(pr.output&&pr.output.peak!==undefined?pr.output.peak:'—')+'</td></tr>']);}}
priceBody.innerHTML=rows.join('');
}
function detailHtml(d){
if(!d||!d.perTurn||!d.perTurn.length)return '<div class="muted" style="padding:8px">无回合数据</div>';
var cells=d.perTurn.map(function(p){
return '<div class="cell" title="命中 '+fmtMoney(p.cost.cached)+' / 未命中 '+fmtMoney(p.cost.uncached)+' / 输出 '+fmtMoney(p.cost.output)+'">'+'<div class="c-head"><b>#'+p.turn+'</b><span class="c-model">'+esc(p.model||'—')+'</span></div>'+'<div class="c-nums">'+(p.hasEstimated?'≈':'')+fmt(p.total)+' tokens · '+(p.cost.total>0?fmtMoney(p.cost.total):(p.cost.unpriced?'未计价':'￥0'))+'</div>'+'<div class="c-sub">入 '+fmt(p.input)+' · 出 '+fmt(p.output)+' · 缓存 '+fmt(p.cacheRead+p.cacheWrite)+(p.estimated?' · 估 '+fmt(p.estimated):'')+'</div>'+'</div>'
}).join('');
return '<div class="cells">'+cells+'</div>'
}
function renderDetailRow(id,tr){
if(!tr||!tr.isConnected)return
var d=tr.nextElementSibling
if(!d||!d.classList.contains('detail')){d=document.createElement('tr');d.className='detail';var td=document.createElement('td');td.colSpan=10;d.appendChild(td);tr.after(d)}
var ch=tr.querySelector('.chev');if(ch)ch.textContent='▾'
loadDetail(id,function(data){
if(!tr.isConnected)return
var td=d.querySelector('td')
if(!td){td=document.createElement('td');td.colSpan=10;d.appendChild(td)}
td.innerHTML=detailHtml(data)
d.classList.add('open')
},true)
}
function render(data){
if(!data){emptyEl.hidden=false;renderCurrent(null);return}
emptyEl.hidden=data.sessions.length>0;
updatedEl.textContent='更新于 '+new Date(data.generatedAt).toLocaleTimeString();
renderPeriod(data.period);
renderPricing(data.pricing);
var t=data.total;
cardsEl.innerHTML=[['会话数',fmt(t.sessions),''],['总消耗(含估算)',fmt(t.total),'≈ 估算 '+fmt(t.estimatedTokens)+' tokens'],['估算费用',fmtMoney(t.cost.total),'命中 '+fmtMoney(t.cost.cached)+' · 未命中 '+fmtMoney(t.cost.uncached)+' · 输出 '+fmtMoney(t.cost.output),'money'],['输入 / 输出',fmt(t.inputTokens)+' / '+fmt(t.outputTokens),'输入 '+fmtFull(t.inputTokens)+' · 输出 '+fmtFull(t.outputTokens)+' tokens'],['缓存读+写',fmt(t.cacheReadTokens+t.cacheWriteTokens),fmtFull(t.cacheReadTokens+t.cacheWriteTokens)+' tokens'],['估算补全',fmt(t.estimatedTokens),fmtFull(t.estimatedTokens)+' tokens']].map(function(c){return '<div class="card"><div class="k">'+esc(c[0])+'</div><div class="v'+(c[3]==='money'?' money':'')+'">'+esc(c[1])+'</div><div class="k">'+esc(c[2])+'</div></div>'}).join('');
bodyEl.innerHTML=data.sessions.map(function(s){
var ttl=(s.hasEstimated?'≈':'')+fmt(s.total);
var costTxt=s.cost.total>0?fmtMoney(s.cost.total):(s.unpriced?'未计价':'￥0');
return '<tr class="row'+(s.current?' currentRow':'')+'" data-id="'+esc(s.sessionId)+'"><td><span class="chev">▸</span></td><td class="title" title="'+esc(s.sessionId)+'">'+esc(s.title||'(无标题)')+(s.current?'<span class="curTag">当前</span>':'')+(s.live?' <span class="live">●</span>':'')+'</td><td class="num">'+s.turnCount+'</td><td class="num" title="'+fmtFull(s.inputTokens)+'">'+fmt(s.inputTokens)+'</td><td class="num" title="'+fmtFull(s.outputTokens)+'">'+fmt(s.outputTokens)+'</td><td class="num" title="'+fmtFull(s.cacheReadTokens+s.cacheWriteTokens)+'">'+fmt(s.cacheReadTokens+s.cacheWriteTokens)+'</td><td class="num est" title="'+fmtFull(s.estimatedTokens)+'">'+(s.estimatedTokens?fmt(s.estimatedTokens):'—')+'</td><td class="num" title="'+fmtFull(s.total)+'">'+ttl+'</td><td class="num money" title="命中 '+fmtMoney(s.cost.cached)+' / 未命中 '+fmtMoney(s.cost.uncached)+' / 输出 '+fmtMoney(s.cost.output)+'">'+costTxt+'</td><td class="num">'+timeAgo(s.lastActiveAt)+'</td></tr>'
}).join('');
var cur=null;
for(var i=0;i<data.sessions.length;i++){if(data.sessions[i].current){cur=data.sessions[i];break}}
renderCurrent(cur);
for(var id in expanded){
if(!Object.prototype.hasOwnProperty.call(expanded,id))continue
var rows=bodyEl.querySelectorAll('tr.row')
for(var j=0;j<rows.length;j++){if(rows[j].getAttribute('data-id')===id){renderDetailRow(id,rows[j]);break}}
}
}
function toggle(id,tr){
var d=tr.nextElementSibling,ch=tr.querySelector('.chev'),open=d&&d.classList.contains('open')
if(open){d.classList.remove('open');var tdd=d.querySelector('td');if(tdd)tdd.innerHTML='';ch.textContent='▸';delete expanded[id];return}
expanded[id]=true
renderDetailRow(id,tr)
}
bodyEl.addEventListener('click',function(e){var tr=e.target.closest?e.target.closest('tr.row'):null;if(tr)toggle(tr.getAttribute('data-id'),tr)});
function renderTabs(){cfgTabs.innerHTML='';var keys=['pricing','css','page-css'];for(var i=0;i<keys.length;i++){var b=document.createElement('button');b.className='tab'+(cfgKey===keys[i]?' active':'');b.textContent=keys[i]==='pricing'?'计价表':keys[i]==='css'?'GUI 样式':'总览页样式';b.dataset.key=keys[i];cfgTabs.appendChild(b)}}
cfgTabs.addEventListener('click',function(e){var b=e.target.closest('.tab');if(!b)return;cfgKey=b.dataset.key;renderTabs();cfgNote.textContent=CFG_NOTES[cfgKey]||'';cfgStatus.textContent='';loadEditor()})
function loadEditor(){cfgNote.textContent=CFG_NOTES[cfgKey]||'';cfgStatus.textContent='';
if(cfgKey==='pricing'){var saved=lsGet(LS_PRICING);if(saved!==null){editor.value=saved;return}fetch(API).then(function(r){return r.json()}).then(function(d){if(d&&d.pricing){var t=d.pricing;editor.value=JSON.stringify({timezone:t.timezone,peakHours:t.peakHours,models:t.models},null,2)}}).catch(function(){editor.value=''})}
else{editor.value=lsGet(cfgKey==='css'?LS_CSS:LS_PAGE)||''}}
function saveCfg(){cfgStatus.className='status';
if(cfgKey==='pricing'){try{JSON.parse(editor.value)}catch(err){cfgStatus.className='status err';cfgStatus.textContent='JSON 格式错误: '+err.message;return}if(!lsSet(LS_PRICING,editor.value)){cfgStatus.className='status err';cfgStatus.textContent='保存失败';return}cfgStatus.textContent='已保存 ✓（约 5 秒后计价生效）'}
else if(cfgKey==='css'){if(!lsSet(LS_CSS,editor.value)){cfgStatus.className='status err';cfgStatus.textContent='保存失败';return}cfgStatus.textContent='已保存 ✓（GUI 约 5 秒后生效）'}
else{if(!lsSet(LS_PAGE,editor.value)){cfgStatus.className='status err';cfgStatus.textContent='保存失败';return}applyPageCss();cfgStatus.textContent='已保存 ✓ 已应用'}}
function resetCfg(){cfgStatus.className='status';
if(cfgKey==='pricing'){lsSet(LS_PRICING,null);cfgStatus.textContent='已恢复默认（约 5 秒后计价生效）'}
else if(cfgKey==='css'){lsSet(LS_CSS,null);cfgStatus.textContent='已恢复默认（GUI 约 5 秒后生效）'}
else{lsSet(LS_PAGE,null);applyPageCss();cfgStatus.textContent='已恢复默认'}
loadEditor()}
document.getElementById('cfgOpen').addEventListener('click',function(){overlay.hidden=false;renderTabs();loadEditor()});
document.getElementById('cfgClose').addEventListener('click',function(){overlay.hidden=true});
document.getElementById('cfgSave').addEventListener('click',saveCfg);
document.getElementById('cfgReset').addEventListener('click',resetCfg);
function load(){
fetch(API).then(function(r){return r.ok?r.json():Promise.reject(new Error('HTTP '+r.status))}).then(function(data){
if(!data){render(null);return}
var key=JSON.stringify([data.period,data.total.sessions,data.total.total,data.total.cost.total,data.sessions.map(function(s){return [s.sessionId,s.title,s.total,s.cost.total,s.turnCount,s.lastActiveAt,s.inputTokens,s.outputTokens,s.cacheReadTokens,s.cacheWriteTokens,s.estimatedTokens,Math.round(s.hitRate*1000),s.unpriced,s.current,s.model,s.live]})]);
if(key===lastKey){updatedEl.textContent='更新于 '+new Date(data.generatedAt).toLocaleTimeString();return}
lastKey=key;
render(data);
}).catch(function(err){updatedEl.textContent='加载失败: '+err.message})}
document.getElementById('refresh').addEventListener('click',load);
load();
// Very slow auto-refresh (10 minutes) instead of the old 3s poll, and pause
// while the tab is in the background so it doesn't keep calling the API.
var POLL=600000, pollTimer=null;
function startPoll(){if(pollTimer===null)pollTimer=setInterval(load,POLL)}
function stopPoll(){if(pollTimer!==null){clearInterval(pollTimer);pollTimer=null}}
document.addEventListener('visibilitychange',function(){
  if(document.hidden){stopPoll()}else{startPoll(); if(document.getElementById('updated'))load()}
});
if(!document.hidden)startPoll();
})();
<\/script>
</body>
</html>`;
//#endregion
//#region ../src/index.ts
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
var __runInitializers = function(thisArg, initializers, value) {
	var useValue = arguments.length > 2;
	for (var i = 0; i < initializers.length; i++) value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
	return useValue ? value : void 0;
};
var __esDecorate = function(ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
	function accept(f) {
		if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected");
		return f;
	}
	var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
	var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
	var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
	var _, done = false;
	for (var i = decorators.length - 1; i >= 0; i--) {
		var context = {};
		for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
		for (var p in contextIn.access) context.access[p] = contextIn.access[p];
		context.addInitializer = function(f) {
			if (done) throw new TypeError("Cannot add initializers after decoration has completed");
			extraInitializers.push(accept(f || null));
		};
		var result = (0, decorators[i])(kind === "accessor" ? {
			get: descriptor.get,
			set: descriptor.set
		} : descriptor[key], context);
		if (kind === "accessor") {
			if (result === void 0) continue;
			if (result === null || typeof result !== "object") throw new TypeError("Object expected");
			if (_ = accept(result.get)) descriptor.get = _;
			if (_ = accept(result.set)) descriptor.set = _;
			if (_ = accept(result.init)) initializers.unshift(_);
		} else if (_ = accept(result)) {
			if (kind === "field") initializers.unshift(_);
			else descriptor[key] = _;
		}
	}
	if (target) Object.defineProperty(target, contextIn.name, descriptor);
	done = true;
};
const PERSISTED_TTL = 3e4;
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
			_usageSession_decorators = [Remote("session")];
			_usageTurn_decorators = [Remote("turn")];
			_usageDetail_decorators = [Remote("detail")];
			_usageAll_decorators = [Remote("all")];
			_usageNow_decorators = [Remote("now")];
			_usageUrl_decorators = [Remote("url")];
			_setPricing_decorators = [Remote("setPricing")];
			__esDecorate(this, null, _usageSession_decorators, {
				kind: "method",
				name: "usageSession",
				static: false,
				private: false,
				access: {
					has: (obj) => "usageSession" in obj,
					get: (obj) => obj.usageSession
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _usageTurn_decorators, {
				kind: "method",
				name: "usageTurn",
				static: false,
				private: false,
				access: {
					has: (obj) => "usageTurn" in obj,
					get: (obj) => obj.usageTurn
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _usageDetail_decorators, {
				kind: "method",
				name: "usageDetail",
				static: false,
				private: false,
				access: {
					has: (obj) => "usageDetail" in obj,
					get: (obj) => obj.usageDetail
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _usageAll_decorators, {
				kind: "method",
				name: "usageAll",
				static: false,
				private: false,
				access: {
					has: (obj) => "usageAll" in obj,
					get: (obj) => obj.usageAll
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _usageNow_decorators, {
				kind: "method",
				name: "usageNow",
				static: false,
				private: false,
				access: {
					has: (obj) => "usageNow" in obj,
					get: (obj) => obj.usageNow
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _usageUrl_decorators, {
				kind: "method",
				name: "usageUrl",
				static: false,
				private: false,
				access: {
					has: (obj) => "usageUrl" in obj,
					get: (obj) => obj.usageUrl
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			__esDecorate(this, null, _setPricing_decorators, {
				kind: "method",
				name: "setPricing",
				static: false,
				private: false,
				access: {
					has: (obj) => "setPricing" in obj,
					get: (obj) => obj.setPricing
				},
				metadata: _metadata
			}, null, _instanceExtraInitializers);
			if (_metadata) Object.defineProperty(this, Symbol.metadata, {
				enumerable: true,
				configurable: true,
				writable: true,
				value: _metadata
			});
		}
		static inject = ["webServer"];
		/**
		* In-memory token store. It is the single source of truth for token usage:
		*   - `session/event` folds every event into the store immediately (for any
		*     session id), regardless of whether anything has asked for it yet;
		*   - the REST/Remote APIs read ONLY this store (never rescan the whole
		*     session log on every request); a session whose events are not flowing
		*     (e.g. old archived ones) is lazily back-filled from its durable log
		*     once, then kept fresh by subsequent events.
		*/
		store = (__runInitializers(this, _instanceExtraInitializers), /* @__PURE__ */ new Map());
		pricingOverride = null;
		pricingCache = null;
		constructor(ctx) {
			super(ctx, "tokenTracker");
			ctx.effect(() => ctx.webServer.register({
				kind: "exact",
				path: "/dsh-token-tracker",
				handler: (req, res) => void this.serveOverviewPage(req, res)
			}), "token-tracker: overview page");
			ctx.effect(() => ctx.webServer.register({
				kind: "exact",
				path: "/dsh-token-tracker/api",
				handler: (req, res) => void this.serveOverviewApi(req, res)
			}), "token-tracker: overview api");
			ctx.on("session/event", (session, event) => {
				if (typeof session.id !== "string") return;
				let entry = this.store.get(session.id);
				if (!entry || !entry.live) {
					entry = {
						seq: 0,
						live: true,
						scannedAt: Date.now(),
						usage: newUsage()
					};
					this.store.set(session.id, entry);
				}
				foldEvent(entry.usage, event, this.estimate.bind(this));
				entry.seq += 1;
				entry.scannedAt = Date.now();
			});
		}
		estimate(message) {
			const meter = this.ctx.get("tokenMeter");
			if (meter?.estimateMessage) try {
				return meter.estimateMessage(message);
			} catch {}
			return estimateMessage(message);
		}
		async candidatePaths() {
			const paths = [];
			const policy = this.ctx.get("sandboxPolicy");
			if (typeof policy?.workspaceRoot === "string") paths.push(policy.workspaceRoot);
			const sessionQuery = this.ctx.get("sessionQuery");
			if (sessionQuery?.listSessions) try {
				const records = await sessionQuery.listSessions();
				for (const rec of records) {
					const cwd = rec.header?.cwd;
					if (typeof cwd === "string" && !paths.includes(cwd)) paths.push(cwd);
				}
			} catch {}
			return paths;
		}
		async loadPricing() {
			const now = Date.now();
			if (this.pricingCache && now - this.pricingCache.at < 1e4) return {
				table: this.pricingCache.table,
				source: this.pricingCache.source
			};
			if (this.pricingOverride !== null) {
				this.pricingCache = {
					at: now,
					table: this.pricingOverride,
					source: "local"
				};
				return {
					table: this.pricingOverride,
					source: "local"
				};
			}
			let table = DEFAULT_PRICING;
			let source = "default";
			const fs = this.ctx.get("fs");
			if (fs?.resolve && fs.readText) {
				const paths = await this.candidatePaths();
				for (const base of paths) try {
					const target = await fs.resolve(base + "/token-pricing.json");
					const parsed = JSON.parse(await fs.readText(target));
					if (parsed && typeof parsed === "object" && parsed.models && typeof parsed.models === "object") {
						table = parsed;
						source = "file";
						break;
					}
				} catch {}
			}
			this.pricingCache = {
				at: now,
				table,
				source
			};
			return {
				table,
				source
			};
		}
		async getUsage(sessionId) {
			const sessions = this.ctx.get("sessions");
			let live;
			if (sessions?.get) try {
				live = sessions.get(sessionId);
			} catch {
				live = void 0;
			}
			const entry = this.store.get(sessionId) ?? null;
			if (live) {
				const events = Array.isArray(live.events) ? live.events : [];
				if (!entry) {
					const fresh = {
						seq: 0,
						live: true,
						scannedAt: Date.now(),
						usage: newUsage()
					};
					this.store.set(sessionId, fresh);
				}
				const cur = this.store.get(sessionId);
				cur.live = true;
				cur.scannedAt = Date.now();
				const from = cur.seq;
				const count = events.length;
				if (from < count) {
					for (let i = from; i < count; i++) foldEvent(cur.usage, events[i], this.estimate.bind(this));
					cur.seq = count;
				}
				return cur;
			}
			if (entry && Date.now() - entry.scannedAt < PERSISTED_TTL) return entry;
			const sessionQuery = this.ctx.get("sessionQuery");
			if (!sessionQuery?.readSession) return entry;
			let snapshot;
			try {
				snapshot = await sessionQuery.readSession(sessionId);
			} catch {
				return entry;
			}
			const events = Array.isArray(snapshot?.events) ? snapshot.events : [];
			const usage = newUsage();
			foldEvents(usage, events, this.estimate.bind(this));
			const next = {
				seq: events.length,
				live: false,
				scannedAt: Date.now(),
				usage
			};
			this.store.set(sessionId, next);
			return next;
		}
		async buildOverview(pricing) {
			const sessionQuery = this.ctx.get("sessionQuery");
			let records = [];
			if (sessionQuery?.listSessions) try {
				records = await sessionQuery.listSessions();
			} catch {
				records = [];
			}
			const ids = [];
			for (const rec of records) {
				if (typeof rec.header?.id === "string") ids.push(rec.header.id);
				if (ids.length >= 300) break;
			}
			const rows = await Promise.all(ids.map(async (id) => {
				try {
					const entry = await this.getUsage(id);
					return entry ? {
						id,
						entry
					} : null;
				} catch {
					return null;
				}
			}));
			const titleMap = /* @__PURE__ */ new Map();
			if (sessionQuery?.readTitleSnapshots && ids.length > 0) try {
				const observations = await sessionQuery.readTitleSnapshots(ids);
				for (const obs of observations) if (obs?.status === "fulfilled" && obs.value?.title?.title) titleMap.set(obs.sessionId, obs.value.title.title);
			} catch {}
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
				if (!row) continue;
				const totals = totalsOf(row.entry.usage, pricing.table, Date.now());
				if (totals.total === 0 && totals.turnCount === 0) continue;
				const rec = records.find((r) => r.header?.id === row.id);
				sessions.push({
					sessionId: row.id,
					title: titleMap.get(row.id) ?? "",
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
					cost: totals.cost
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
			for (const s of sessions) if (s.live && s.lastActiveAt > bestAt) {
				bestAt = s.lastActiveAt;
				currentSessionId = s.sessionId;
			}
			for (const s of sessions) if (s.sessionId === currentSessionId) s.current = true;
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
						unpriced: totalCost === 0 && sessions.some((s) => s.unpriced)
					}
				},
				sessions
			};
		}
		async usageSession(args) {
			const pricing = await this.loadPricing();
			const entry = await this.getUsage(args.sessionId);
			if (!entry) return null;
			const { perTurn: _perTurn, ...rest } = totalsOf(entry.usage, pricing.table, Date.now());
			return rest;
		}
		async usageTurn(args) {
			const pricing = await this.loadPricing();
			const entry = await this.getUsage(args.sessionId);
			if (!entry) return null;
			const tu = entry.usage.turns.get(args.turn);
			if (!tu) return null;
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
				cost: bucketCosts([...tu.buckets.values()], pricing.table, Date.now())
			};
		}
		async usageDetail(args) {
			const pricing = await this.loadPricing();
			const entry = await this.getUsage(args.sessionId);
			if (!entry) return null;
			const totals = totalsOf(entry.usage, pricing.table, Date.now());
			return {
				sessionId: args.sessionId,
				...totals
			};
		}
		async usageAll() {
			const pricing = await this.loadPricing();
			const overview = await this.buildOverview(pricing);
			overview.pricing = {
				source: pricing.source,
				timezone: pricing.table.timezone ?? "",
				peakHours: pricing.table.peakHours ?? [],
				models: pricing.table.models
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
				if (entry?.prices) models[name] = { prices: entry.prices };
			}
			return {
				period: periodOfHour(hour, pricing.table),
				hour,
				beijingTime: new Date(nowMs).toISOString(),
				source: pricing.source,
				models
			};
		}
		async usageUrl() {
			const port = this.ctx.webServer.port;
			if (typeof port !== "number" || port === 0) return null;
			return { url: `http://127.0.0.1:${port}/dsh-token-tracker` };
		}
		async setPricing(args) {
			const json = args.json;
			if (json === null || json === "") {
				this.pricingOverride = null;
				this.pricingCache = null;
				return { ok: true };
			}
			try {
				const parsed = JSON.parse(json);
				if (parsed && typeof parsed === "object" && parsed.models && typeof parsed.models === "object") {
					this.pricingOverride = parsed;
					this.pricingCache = null;
					return { ok: true };
				}
				return {
					ok: false,
					error: "invalid pricing schema: missing models"
				};
			} catch (error) {
				return {
					ok: false,
					error: error instanceof Error ? error.message : String(error)
				};
			}
		}
		serveOverviewPage(_req, res) {
			res.writeHead(200, {
				"Content-Type": "text/html; charset=utf-8",
				"Cache-Control": "no-store"
			});
			res.end(OVERVIEW_HTML);
		}
		async serveOverviewApi(req, res) {
			const url = req.url ?? "";
			const qi = url.indexOf("?");
			const params = /* @__PURE__ */ new Map();
			if (qi >= 0) for (const part of url.slice(qi + 1).split("&")) {
				if (!part) continue;
				const eq = part.indexOf("=");
				const key = decodeURIComponent(eq >= 0 ? part.slice(0, eq) : part);
				const value = decodeURIComponent(eq >= 0 ? part.slice(eq + 1) : "");
				params.set(key, value);
			}
			try {
				const pricing = await this.loadPricing();
				const sessionId = params.get("session");
				if (sessionId) {
					const entry = await this.getUsage(sessionId);
					if (!entry) {
						this.sendJson(res, 404, { error: "session not found" });
						return;
					}
					const totals = totalsOf(entry.usage, pricing.table, Date.now());
					this.sendJson(res, 200, {
						sessionId,
						...totals
					});
					return;
				}
				const overview = await this.buildOverview(pricing);
				overview.pricing = {
					source: pricing.source,
					timezone: pricing.table.timezone ?? "",
					peakHours: pricing.table.peakHours ?? [],
					models: pricing.table.models
				};
				this.sendJson(res, 200, overview);
			} catch (error) {
				this.sendJson(res, 500, { error: error instanceof Error ? error.message : String(error) });
			}
		}
		sendJson(res, status, payload) {
			let body;
			try {
				body = JSON.stringify(payload);
			} catch {
				body = "{\"error\":\"serialize failed\"}";
			}
			res.writeHead(status, {
				"Content-Type": "application/json; charset=utf-8",
				"Cache-Control": "no-store"
			});
			res.end(body);
		}
	};
})();
//#endregion
export { TokenTrackerService, TokenTrackerService as default };
