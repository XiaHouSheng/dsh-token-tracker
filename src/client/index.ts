/**
 * Browser half of the Token Tracker: registers the header badge, period tag,
 * Tracker button, composer dock line, turn tail, and the injected
 * `conversation.view` tab. All data comes from the host's plain HTTP JSON API
 * (`/dsh-token-tracker/api`), so the typert Remote surface never has to ride
 * the browser assembly bus and no api-remotes harness wiring is required.
 */

import type { Context } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-runtime/client'
import type { TurnTailOwnerProps } from '@deepseek-ai/dsh-client-ui-conversation/client'
import { BUILTIN_CSS } from './style.ts'
import {
  PeriodBadge, OpenOverview, SessionTotal, DockTokens, TurnTokens, TokenView,
} from './components.tsx'

export const inject = ['slots']

export function apply(ctx: Context): void {
  const styleTag = document.createElement('style')
  styleTag.dataset.plugin = '@deepseek-ai/dsh-token-tracker'
  styleTag.textContent = BUILTIN_CSS
  document.head.appendChild(styleTag)

  ctx.effect(() => () => styleTag.remove())

  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'dtt-period', order: -1,
  }, PeriodBadge))
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'dtt-header', order: -0.5,
  }, SessionTotal))
  ctx.slots.inject('conversation.session.header.utilities', () => ctx.slots.register({
    name: 'conversation.session.header.utilities', id: 'dtt-open', order: 1,
  }, OpenOverview))
  ctx.slots.inject('conversation.composer.dock', () => ctx.slots.register({
    name: 'conversation.composer.dock', id: 'dtt-dock', order: 1,
  }, DockTokens))
  ctx.slots.inject('conversation.chat.turnTail', () => ctx.slots.register({
    name: 'conversation.chat.turnTail',
    select: (owner: TurnTailOwnerProps) => {
      if (owner.turn.status !== 'closed') return null
      return { turn: owner.turn.turn }
    },
  }, TurnTokens))
  ctx.slots.inject('conversation.view', () => ctx.slots.register({
    name: 'conversation.view', id: 'token-tracker', order: 20, label: 'Token',
  }, TokenView))
}
