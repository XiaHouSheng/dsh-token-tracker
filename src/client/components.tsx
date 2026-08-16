/** Browser components: header badge, period tag, Tracker button, dock line, turn tail, and the injected conversation view. */

import React from 'react'
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots'
import type { OverviewPayload, UsageDetail, UsageTotals, UsageTurn } from '../types.ts'
import { fetchOverview, fetchSession, fetchTurn, overviewUrl } from './api.ts'

/** Explicitly imported so component props carry it (it is already part of PropsRuntime). */
type HeaderUtilProps = PropsRuntime<'conversation.session.header.utilities'>
type DockProps = PropsRuntime<'conversation.composer.dock'>
type TurnTailProps = PropsRuntime<'conversation.chat.turnTail'> & { matched: { turn: number } }
type TokenViewProps = PropsRuntime<'conversation.view'>

function fmt(n: number): string {
  n = Math.round(n || 0)
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

function fmtFull(n: number): string {
  try { return Math.round(n || 0).toLocaleString() } catch { return String(n || 0) }
}

function fmtAmt(n: number): string {
  n = Number(n) || 0
  if (n === 0) return '0'
  if (n < 0.01) return n.toFixed(4)
  return n.toFixed(2)
}

function fmtMoney(n: number): string {
  return '￥' + fmtAmt(n)
}

function timeAgo(ms: number): string {
  if (!ms) return '—'
  const d = Date.now() - ms
  if (d < 60000) return '刚刚'
  if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前'
  if (d < 86400000) return Math.floor(d / 3600000) + ' 小时前'
  return Math.floor(d / 86400000) + ' 天前'
}

function LineIcon({ size }: { size?: number }): React.ReactElement {
  const s = size ?? 12
  return React.createElement('svg', {
    viewBox: '0 0 16 16', width: s, height: s, fill: 'none', 'aria-hidden': true, style: { flex: 'none' },
  }, React.createElement('polyline', {
    points: '1.5 12.5 4.5 8.5 7.5 10.5 11 5.5 14.5 3',
    stroke: 'currentColor', strokeWidth: '1.6', strokeLinecap: 'round', strokeLinejoin: 'round',
  }), React.createElement('circle', { cx: '14.5', cy: '3', r: '1.1', fill: 'currentColor' }))
}

function sameUsage(a: UsageTotals | null, b: UsageTotals | null): boolean {
  if (!a || !b) return false
  return a.total === b.total && a.inputTokens === b.inputTokens && a.outputTokens === b.outputTokens
    && a.cacheReadTokens === b.cacheReadTokens && a.cacheWriteTokens === b.cacheWriteTokens
    && a.estimatedTokens === b.estimatedTokens && a.turnCount === b.turnCount && a.model === b.model
    && a.cost.total === b.cost.total
}

function useSessionUsage(sessionId: string, useSession: HeaderUtilProps['useSession']): UsageTotals | null {
  const [data, setData] = React.useState<UsageTotals | null>(null)
  const turnEnds = useSession
    ? (useSession(s => (s as { turnEnds: { size: number } }).turnEnds.size) as number)
    : 0
  React.useEffect(() => {
    if (!sessionId) return
    let alive = true
    void fetchSession(sessionId).then((value) => {
      if (alive && value) setData(prev => (sameUsage(prev, value) ? prev : value))
    }).catch(() => {})
    return () => { alive = false }
  }, [sessionId, turnEnds])
  return data
}

export function PeriodBadge(): React.ReactElement | null {
  const [info, setInfo] = React.useState<{ period: 'peak' | 'offpeak'; overview: OverviewPayload } | null>(null)
  React.useEffect(() => {
    let alive = true
    let timer: number | undefined
    const tick = (): void => {
      void fetchOverview().then((overview) => {
        if (!alive || !overview) return
        setInfo(prev => (prev && prev.period === overview.period ? prev : { period: overview.period, overview }))
        timer = window.setTimeout(tick, 60000)
      }).catch(() => { timer = window.setTimeout(tick, 60000) })
    }
    tick()
    return () => { alive = false; if (timer !== undefined) window.clearTimeout(timer) }
  }, [])
  if (!info) return null
  const peak = info.period === 'peak'
  const pricing = info.overview.pricing
  const lines = [peak ? '高峰时段' : '空闲时段']
  for (const name of Object.keys(pricing?.models ?? {})) {
    const entry = (pricing?.models ?? {})[name]
    const first = Array.isArray(entry) && entry.length > 0 ? entry[0] : null
    const prices = first?.prices
    if (!prices) continue
    const cached = prices.inputCached?.[info.period] ?? '—'
    const uncached = prices.inputUncached?.[info.period] ?? '—'
    const output = prices.output?.[info.period] ?? '—'
    lines.push(`${name}：命中 ￥${cached}/M · 未命中 ￥${uncached}/M · 输出 ￥${output}/M`)
  }
  return React.createElement('span', {
    className: 'dtt-period ' + (peak ? 'dtt-peak' : 'dtt-offpeak'),
    title: lines.join('\n'),
  }, `● ${peak ? '高峰' : '空闲'}`)
}

export function OpenOverview(): React.ReactElement | null {
  const url = overviewUrl()
  if (!url) return null
  return React.createElement('a', {
    className: 'dtt-open', href: url, target: '_blank', rel: 'noreferrer', title: '打开 Token 总览页面（全屏）',
  }, React.createElement(LineIcon, { size: 13 }), React.createElement('span', null, 'Tracker'))
}

export function SessionTotal(props: HeaderUtilProps): React.ReactElement | null {
  const data = useSessionUsage(props.sessionId, props.useSession)
  if (!data || (data.billedTotal === 0 && data.estimatedTokens === 0)) return null
  const label = (data.hasEstimated ? '≈' : '') + fmt(data.total)
  const costText = data.cost.total > 0 ? ` · ￥：${fmtAmt(data.cost.total)}` : ''
  const title = `本会话总消耗 ${fmtFull(data.total)} tokens（输入 ${fmtFull(data.inputTokens)} / 输出 ${fmtFull(data.outputTokens)}`
    + ` / 缓存 ${fmtFull(data.cacheReadTokens + data.cacheWriteTokens)}`
    + (data.hasEstimated ? ` / 估算 ${fmtFull(data.estimatedTokens)}` : '')
    + ` / 费用 ￥${fmtAmt(data.cost.total)}）`
  return React.createElement('span', { className: 'dtt-token', title }, React.createElement(LineIcon, { size: 13 }), `TOKEN：${label}${costText}`)
}

export function DockTokens(props: DockProps): React.ReactElement | null {
  const data = useSessionUsage(props.sessionId, props.useSession)
  if (!data || (data.billedTotal === 0 && data.estimatedTokens === 0)) return null
  const parts: React.ReactElement[] = []
  parts.push(React.createElement('span', null, '本会话消耗 '))
  parts.push(React.createElement('b', null, (data.hasEstimated ? '≈' : '') + fmt(data.total) + ' tokens'))
  if (data.cost.total > 0) {
    parts.push(React.createElement('span', null, ' · 费用 '))
    parts.push(React.createElement('b', null, fmtMoney(data.cost.total)))
  }
  parts.push(React.createElement('span', null, ` · 输入 ${fmt(data.inputTokens)}`))
  parts.push(React.createElement('span', null, ` · 输出 ${fmt(data.outputTokens)}`))
  const cache = data.cacheReadTokens + data.cacheWriteTokens
  if (cache > 0) parts.push(React.createElement('span', null, ` · 缓存 ${fmt(cache)}`))
  if (data.hasEstimated) parts.push(React.createElement('span', { className: 'dtt-est' }, ` · 估算 ${fmt(data.estimatedTokens)}`))
  if (data.model) parts.push(React.createElement('span', null, ` · ${data.model}`))
  return React.createElement('div', { className: 'dtt-dock' }, parts)
}

export function TurnTokens(props: TurnTailProps): React.ReactElement | null {
  const sessionId = props.sessionId
  const turn = props.matched.turn
  const [data, setData] = React.useState<UsageTurn | null>(null)
  React.useEffect(() => {
    if (!sessionId || turn === undefined) return
    let alive = true
    let attempts = 0
    let timer: number | undefined
    const tick = (): void => {
      attempts += 1
      void fetchTurn(sessionId, turn).then((value) => {
        if (!alive) return
        if (value) { setData(value); if (timer !== undefined) window.clearInterval(timer) }
        else if (attempts >= 3 && timer !== undefined) window.clearInterval(timer)
      }).catch(() => { if (attempts >= 3 && timer !== undefined) window.clearInterval(timer) })
    }
    tick()
    timer = window.setInterval(tick, 1000)
    return () => { alive = false; if (timer !== undefined) window.clearInterval(timer) }
  }, [sessionId, turn])
  if (!data || data.messages === 0) return null
  const title = `回合 #${data.turn}：输入 ${fmtFull(data.input)} / 输出 ${fmtFull(data.output)}`
    + (data.cacheRead + data.cacheWrite > 0 ? ` / 缓存 ${fmtFull(data.cacheRead + data.cacheWrite)}` : '')
    + (data.hasEstimated ? ` / 估算 ${fmtFull(data.estimated)}` : '')
    + ` / 费用 ${fmtMoney(data.cost.total)}`
    + (data.model ? ` / 模型 ${data.model}` : '')
  const label = (data.hasEstimated ? '≈' : '') + fmt(data.total) + ' tokens' + (data.cost.total > 0 ? ` · ${fmtMoney(data.cost.total)}` : '')
  return React.createElement('div', { className: 'dtt-turn', title }, React.createElement(LineIcon, { size: 11 }), React.createElement('span', null, label))
}

export function TokenView(props: TokenViewProps): React.ReactElement {
  const sessionId = props.sessionId
  const turnEnds = props.useSession
    ? (props.useSession(s => (s as { turnEnds: { size: number } }).turnEnds.size) as number)
    : 0
  const [data, setData] = React.useState<OverviewPayload | null>(null)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)
  const [detail, setDetail] = React.useState<UsageDetail | null>(null)
  const refresh = (): void => {
    void fetchOverview().then(value => { if (value) setData(value) }).catch(() => {})
  }
  React.useEffect(() => {
    if (!sessionId) return
    let alive = true
    void fetchOverview().then((value) => { if (alive && value) setData(value) }).catch(() => {})
    return () => { alive = false }
  }, [sessionId, turnEnds])
  const toggleDetail = (id: string): void => {
    if (expandedId === id) { setExpandedId(null); setDetail(null); return }
    setExpandedId(id)
    setDetail(null)
    void fetchSession(id).then(value => { if (value) setDetail(value) }).catch(() => {})
  }
  if (!data) {
    return React.createElement('div', { className: 'dtt-view' }, React.createElement('div', { className: 'dtt-view-loading' }, '加载中…'))
  }
  const peak = data.period === 'peak'
  const t = data.total
  const head = React.createElement('div', { className: 'dtt-view-head' },
    React.createElement('span', { className: 'dtt-period ' + (peak ? 'dtt-peak' : 'dtt-offpeak') }, `● ${peak ? '高峰' : '空闲'}`),
    React.createElement('span', { className: 'dtt-view-sum' }, `会话 ${t.sessions} · 总消耗 ${fmt(t.total)} · 费用 ${fmtMoney(t.cost.total)}`),
    React.createElement('span', { style: { flex: 1 } }),
    React.createElement('button', { type: 'button', className: 'dtt-view-btn', onClick: refresh }, '刷新'),
  )
  const rows: React.ReactElement[] = []
  for (const s of data.sessions) {
    const costTxt = s.cost.total > 0 ? fmtMoney(s.cost.total) : (s.unpriced ? '未计价' : '￥0')
    rows.push(React.createElement('tr', {
      key: s.sessionId,
      className: 'dtt-view-row' + (s.current ? ' cur' : '') + (expandedId === s.sessionId ? ' open' : ''),
      onClick: () => toggleDetail(s.sessionId),
    },
      React.createElement('td', { className: 'dtt-view-title', title: s.sessionId }, s.title || '(无标题)', s.current ? React.createElement('span', { className: 'dtt-view-cur' }, '当前') : null),
      React.createElement('td', { className: 'num' }, s.turnCount),
      React.createElement('td', { className: 'num', title: fmtFull(s.inputTokens) }, fmt(s.inputTokens)),
      React.createElement('td', { className: 'num', title: fmtFull(s.outputTokens) }, fmt(s.outputTokens)),
      React.createElement('td', { className: 'num', title: fmtFull(s.cacheReadTokens + s.cacheWriteTokens) }, fmt(s.cacheReadTokens + s.cacheWriteTokens)),
      React.createElement('td', { className: 'num dtt-view-est', title: fmtFull(s.estimatedTokens) }, s.estimatedTokens ? fmt(s.estimatedTokens) : '—'),
      React.createElement('td', {
        className: 'num dtt-view-money',
        title: `命中 ${fmtMoney(s.cost.cached)} / 未命中 ${fmtMoney(s.cost.uncached)} / 输出 ${fmtMoney(s.cost.output)}`,
      }, costTxt),
      React.createElement('td', { className: 'num' }, timeAgo(s.lastActiveAt)),
    ))
    if (expandedId === s.sessionId) {
      let body: React.ReactElement
      if (detail) {
        const cells = (detail.perTurn ?? []).map((p) => React.createElement('div', {
          key: p.turn,
          className: 'dtt-cell',
          title: `命中 ${fmtMoney(p.cost.cached)} / 未命中 ${fmtMoney(p.cost.uncached)} / 输出 ${fmtMoney(p.cost.output)}`,
        },
          React.createElement('div', { className: 'c-head' }, React.createElement('b', null, `#${p.turn}`), React.createElement('span', { className: 'c-model' }, p.model || '—')),
          React.createElement('div', { className: 'c-nums' }, `${(p.hasEstimated ? '≈' : '') + fmt(p.total)} tokens · ${p.cost.total > 0 ? fmtMoney(p.cost.total) : '￥0'}`),
          React.createElement('div', { className: 'c-sub' }, `入 ${fmt(p.input)} · 出 ${fmt(p.output)} · 缓存 ${fmt(p.cacheRead + p.cacheWrite)}${p.estimated ? ` · 估 ${fmt(p.estimated)}` : ''}`),
        ))
        body = detail.perTurn && detail.perTurn.length > 0
          ? React.createElement('div', { className: 'dtt-cells' }, cells)
          : React.createElement('div', { className: 'dtt-view-loading' }, '无回合数据')
      } else {
        body = React.createElement('div', { className: 'dtt-view-loading' }, '加载中…')
      }
      rows.push(React.createElement('tr', { key: s.sessionId + '-d' }, React.createElement('td', { colSpan: 8 }, body)))
    }
  }
  const table = rows.length > 0
    ? React.createElement('table', { className: 'dtt-view-table' },
      React.createElement('thead', null, React.createElement('tr', null,
        React.createElement('th', null, '标题'),
        React.createElement('th', { className: 'num' }, '轮次'),
        React.createElement('th', { className: 'num' }, '输入'),
        React.createElement('th', { className: 'num' }, '输出'),
        React.createElement('th', { className: 'num' }, '缓存'),
        React.createElement('th', { className: 'num' }, '估算'),
        React.createElement('th', { className: 'num' }, '费用'),
        React.createElement('th', { className: 'num' }, '最后活动'),
      )),
      React.createElement('tbody', null, rows),
    )
    : React.createElement('div', { className: 'dtt-view-empty' }, '暂无消耗数据')
  return React.createElement('div', { className: 'dtt-view' }, head, table)
}
