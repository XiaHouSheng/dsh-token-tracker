/** Package invariant companion for `@deepseek-ai/dsh-token-tracker`. */
import type { Context } from '@deepseek-ai/cordis';
export declare const name = "token-tracker-invariant";
export declare const inject: string[];
/**
 * Register this package's invariant companion.
 * @param ctx - Host context carrying the invariant registry.
 * @returns the registration disposer after setup succeeds.
 */
export declare const apply: (ctx: Context) => Promise<() => void>;
//# sourceMappingURL=invariant.d.ts.map