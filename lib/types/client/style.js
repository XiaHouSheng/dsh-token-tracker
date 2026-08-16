/** Built-in GUI styles (global .dtt-* classes so the localStorage overrides keep working). */
export const BUILTIN_CSS = `
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
export function readLs(key) {
    try {
        return window.localStorage.getItem(key);
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=style.js.map