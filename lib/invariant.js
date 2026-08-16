//#region src/invariant.ts
const PACKAGE_NAME = "@deepseek-ai/dsh-token-tracker";
const name = "token-tracker-invariant";
const inject = ["invariants"];
/** No runtime invariant: the tokenTracker Remote service owns its own cache folding and pricing fallbacks. */
const install = () => {};
/**
* Register this package's invariant companion.
* @param ctx - Host context carrying the invariant registry.
* @returns the registration disposer after setup succeeds.
*/
const apply = (ctx) => Promise.resolve(ctx.invariants.register(PACKAGE_NAME, install));
//#endregion
export { apply, inject, name };
