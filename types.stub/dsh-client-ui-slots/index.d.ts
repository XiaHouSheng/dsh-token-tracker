/** Build-time ambient stub for `@deepseek-ai/dsh-client-ui-slots`; never shipped. */

/**
 * Per-slot props type. The plugin uses it structurally for its injected
 * header/dock/turn-tail/view components; only the properties it reads are
 * declared.
 */
export type PropsRuntime<
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _Slot extends string = string,
> = {
  sessionId: string
  useSession?: <T>(selector?: (state: unknown) => T) => T
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [k: string]: any
}
