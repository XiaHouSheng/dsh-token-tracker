/**
 * Self-contained ambient stub for `@deepseek-ai/dsh-typert-protocol`.
 *
 * Used ONLY at build time so `tsc` can emit the plugin's `.d.ts` without a
 * harness checkout or a registry pull of the real peer package. The emitted
 * declarations keep the real `@deepseek-ai/dsh-typert-protocol` import
 * specifier, which the consumer resolves at install time; this file is never
 * shipped.
 */
import type { IncomingMessage, ServerResponse } from 'node:http'

/** Base class for a typert Remote service. The plugin extends it and adds a `tokenTracker` surface. */
export class TypertRemoteService {
  constructor(ctx: unknown, name: string) { void ctx; void name }
  ctx: {
    get(id: string): unknown
    on(event: string, handler: (...args: any[]) => void): unknown
    effect(fn: () => unknown, name?: string): unknown
    webServer: {
      register(route: { kind: string; path: string; handler: (req: IncomingMessage, res: ServerResponse) => void }): void
      port: number
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    [k: string]: any
  }
}

/** Stage-3 decorator used to expose a class method as a typert Remote handler. */
export function Remote(defaultIntent?: string): any {
  void defaultIntent
  return (_value: any, _context: any) => undefined
}
