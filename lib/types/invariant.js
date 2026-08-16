/** Package invariant companion for `@deepseek-ai/dsh-token-tracker`. */
const PACKAGE_NAME = '@deepseek-ai/dsh-token-tracker';
export const name = 'token-tracker-invariant';
export const inject = ['invariants'];
/** No runtime invariant: the tokenTracker Remote service owns its own cache folding and pricing fallbacks. */
const install = () => { };
/**
 * Register this package's invariant companion.
 * @param ctx - Host context carrying the invariant registry.
 * @returns the registration disposer after setup succeeds.
 */
export const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
/* jscpd:ignore-end */
//# sourceMappingURL=invariant.js.map