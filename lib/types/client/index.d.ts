/**
 * Browser half of the Token Tracker: registers the header badge, period tag,
 * Tracker button, composer dock line, turn tail, and the injected
 * `conversation.view` tab. All data comes from the host's plain HTTP JSON API
 * (`/dsh-token-tracker/api`), so the typert Remote surface never has to ride
 * the browser assembly bus and no api-remotes harness wiring is required.
 */
import type { Context } from '@deepseek-ai/cordis';
export declare const inject: string[];
export declare function apply(ctx: Context): void;
//# sourceMappingURL=index.d.ts.map