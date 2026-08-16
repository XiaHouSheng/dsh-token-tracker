/** Standalone overview page: summary cards, session table with expandable per-turn cells, pricing table, and the localStorage-backed config panel. */

export const OVERVIEW_HTML = `<!doctype html>
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
</script>
</body>
</html>`
