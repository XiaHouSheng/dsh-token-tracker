/** Shared JSON payload types for the token-tracker Remote surface and overview page. */

export interface CostBreakdown {
  cached: number
  uncached: number
  output: number
  estimated: number
  total: number
  unpriced: boolean
}

export interface UsageTotals {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  estimatedTokens: number
  providerCalls: number
  estimatedCalls: number
  turnCount: number
  turnStarts: number
  lastActiveAt: number
  billedTotal: number
  total: number
  hasEstimated: boolean
  model: string
  hitRate: number
  unpriced: boolean
  cost: CostBreakdown
}

export interface UsageTurn {
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
  cost: CostBreakdown
}

export interface UsageDetail extends UsageTotals {
  sessionId: string
  perTurn: UsageTurn[]
}

export interface SessionRow {
  sessionId: string
  title: string
  live: boolean
  createdAt: number
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheWriteTokens: number
  estimatedTokens: number
  providerCalls: number
  estimatedCalls: number
  turnCount: number
  lastActiveAt: number
  billedTotal: number
  total: number
  hasEstimated: boolean
  model: string
  hitRate: number
  unpriced: boolean
  cost: CostBreakdown
  current?: boolean
}

export interface OverviewPayload {
  generatedAt: number
  period: 'peak' | 'offpeak'
  currentSessionId: string | null
  total: {
    sessions: number
    inputTokens: number
    outputTokens: number
    cacheReadTokens: number
    cacheWriteTokens: number
    estimatedTokens: number
    billedTotal: number
    total: number
    cost: CostBreakdown
  }
  sessions: SessionRow[]
  pricing?: {
    source: 'local' | 'file' | 'default'
    timezone: string
    peakHours: { start: number; end: number }[]
    models: Record<string, PricingEntry[]>
  }
}

export interface PricingEntry {
  effectiveFrom?: string
  note?: string
  prices: {
    inputCached: { offpeak?: number; peak?: number }
    inputUncached: { offpeak?: number; peak?: number }
    output: { offpeak?: number; peak?: number }
  }
}

export interface PricingTable {
  timezone?: string
  peakHours?: { start: number; end: number }[]
  models: Record<string, PricingEntry[]>
}

export interface PeriodInfo {
  period: 'peak' | 'offpeak'
  hour: number
  beijingTime: string
  source: 'local' | 'file' | 'default'
  models: Record<string, { prices: PricingEntry['prices'] }>
}
