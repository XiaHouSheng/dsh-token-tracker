/**
 * Self-contained ambient stub for `@deepseek-ai/cordis`.
 *
 * Build-time only; never shipped. Consumers resolve the real package.
 * An interface so the plugin's `declare module '@deepseek-ai/cordis'` block can
 * augment `Context.tokenTracker`.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

export interface Context {
  get(id: string): unknown
  on(event: string, handler: (...args: any[]) => void): unknown
  effect(fn: () => unknown, name?: string): unknown
  webServer: {
    register(route: { kind: string; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void }): void
    port: number
  }
  invariants: {
    register<T>(name: string, installer: T): () => void
  }
  slots: {
    inject(slot: string, register: () => unknown): unknown
    register(
      spec: { name: string; id?: string; order?: number; label?: string; select?: unknown },
      component: unknown,
    ): unknown
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}
