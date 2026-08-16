/**
 * Usage folding over the durable session log. Each `assistant/message` event
 * carries provider-reported `usage` when the adapter reported token accounting;
 * missing usage falls back to a heuristic estimate. Messages are attributed to
 * the model named by the latest `request/header` and to the Beijing hour of
 * their event time, so cost can be computed per model/period later.
 */

import type { SessionEvent } from '@deepseek-ai/dsh-session/types'
import type { PricingTable } from './types.ts'
import { beijingHour, bucketCosts, type CostBucket } from './pricing.ts'

export interface TurnUsage {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  estimated: number
  messages: number
  model: string
  buckets: Map<string, CostBucket>
}

export interface UsageState {
  input: number
  output: number
  cacheRead: number
  cacheWrite: number
  estimated: number
  calls: number
  estimatedCalls: number
  turnStarts: number
  lastAt: number
  currentModel: string
  turns: Map<number, TurnUsage>
}

export function newUsage(): UsageState {
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
    currentModel: '',
    turns: new Map(),
  }
}

export function estimateContent(blocks: unknown): number {
  const CHARS_PER_TOKEN = 4
  const BLOCK_OVERHEAD = 4
  if (!Array.isArray(blocks)) return 0
  let tokens = 0
  for (const raw of blocks) {
    const block = raw as { type?: string; text?: string; name?: string; arguments?: string; content?: unknown }
    if (block === null || typeof block !== 'object') { tokens += BLOCK_OVERHEAD; continue }
    if (block.type === 'text' || block.type === 'reasoning') {
      tokens += Math.ceil(String(block.text ?? '').length / CHARS_PER_TOKEN) + BLOCK_OVERHEAD
    } else if (block.type === 'tool-call') {
      tokens += Math.ceil(String(block.name ?? '').length / CHARS_PER_TOKEN)
        + Math.ceil(String(block.arguments ?? '').length / CHARS_PER_TOKEN)
        + BLOCK_OVERHEAD
    } else if (block.type === 'tool-result') {
      tokens += estimateContent(block.content) + BLOCK_OVERHEAD
    } else {
      let size = 0
      try { size = JSON.stringify(block).length } catch { size = 0 }
      tokens += BLOCK_OVERHEAD + Math.ceil(size / CHARS_PER_TOKEN)
    }
  }
  return tokens
}

export function estimateMessage(message: unknown): number {
  if (!message || typeof message !== 'object') return 0
  return estimateContent((message as { content?: unknown }).content) + 4
}

export function foldEvent(usage: UsageState, event: SessionEvent, estimate: (message: unknown) => number): void {
  if (typeof event.time === 'number' && event.time > usage.lastAt) usage.lastAt = event.time
  if (event.type === 'turn/start') { usage.turnStarts += 1; return }
  if (event.type === 'request/header') {
    const header = (event.data as { header?: { config?: { model?: string } } } | undefined)?.header
    if (typeof header?.config?.model === 'string') usage.currentModel = header.config.model
    return
  }
  if (event.type !== 'assistant/message') return
  const data = event.data as { turn?: number; message?: unknown; usage?: { inputTokens?: number; outputTokens?: number; cacheReadTokens?: number; cacheWriteTokens?: number } } | undefined
  if (!data || typeof data !== 'object') return
  const turn = typeof data.turn === 'number' ? data.turn : 0
  let tu = usage.turns.get(turn)
  if (!tu) {
    tu = {
      input: 0, output: 0, cacheRead: 0, cacheWrite: 0, estimated: 0, messages: 0,
      model: '', buckets: new Map(),
    }
    usage.turns.set(turn, tu)
  }
  tu.messages += 1
  if (usage.currentModel !== '') tu.model = usage.currentModel
  const hour = beijingHour(typeof event.time === 'number' ? event.time : Date.now())
  const key = usage.currentModel + '|' + hour
  let bucket = tu.buckets.get(key)
  if (!bucket) {
    bucket = { model: usage.currentModel, hour, input: 0, cacheRead: 0, cacheWrite: 0, output: 0, estimated: 0 }
    tu.buckets.set(key, bucket)
  }
  const u = data.usage
  if (u && typeof u === 'object') {
    const input = typeof u.inputTokens === 'number' ? u.inputTokens : 0
    const output = typeof u.outputTokens === 'number' ? u.outputTokens : 0
    const cacheRead = typeof u.cacheReadTokens === 'number' ? u.cacheReadTokens : 0
    const cacheWrite = typeof u.cacheWriteTokens === 'number' ? u.cacheWriteTokens : 0
    usage.input += input
    usage.output += output
    usage.cacheRead += cacheRead
    usage.cacheWrite += cacheWrite
    usage.calls += 1
    tu.input += input
    tu.output += output
    tu.cacheRead += cacheRead
    tu.cacheWrite += cacheWrite
    bucket.input += input
    bucket.output += output
    bucket.cacheRead += cacheRead
    bucket.cacheWrite += cacheWrite
  } else {
    const est = estimate(data.message)
    usage.estimated += est
    usage.estimatedCalls += 1
    tu.estimated += est
    bucket.estimated += est
  }
}

export function foldEvents(usage: UsageState, events: readonly SessionEvent[], estimate: (message: unknown) => number): void {
  for (const event of events) foldEvent(usage, event, estimate)
}

export function totalsOf(usage: UsageState, table: PricingTable, nowMs: number) {
  const billed = usage.input + usage.output + usage.cacheRead + usage.cacheWrite
  const perTurn: {
    turn: number
    messages: number
    input: number
    output: number
    cacheRead: number
    cacheWrite: number
    estimated: number
    billed: number
    total: number
    hasEstimated: boolean
    model: string
    cost: ReturnType<typeof bucketCosts>
  }[] = []
  let costCached = 0
  let costUncached = 0
  let costOutput = 0
  let costEstimated = 0
  let unpriced = false
  for (const [turn, tu] of usage.turns) {
    const cost = bucketCosts([...tu.buckets.values()], table, nowMs)
    if (cost.unpriced) unpriced = true
    costCached += cost.cached
    costUncached += cost.uncached
    costOutput += cost.output
    costEstimated += cost.estimated
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
      cost,
    })
  }
  perTurn.sort((a, b) => a.turn - b.turn)
  const totalInput = usage.input + usage.cacheRead + usage.cacheWrite
  const hitRate = totalInput > 0 ? usage.cacheRead / totalInput : 0
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
      unpriced,
    },
    perTurn,
  }
}
