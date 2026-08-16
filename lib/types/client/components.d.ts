/** Browser components: header badge, period tag, Tracker button, dock line, turn tail, and the injected conversation view. */
import React from 'react';
import type { PropsRuntime } from '@deepseek-ai/dsh-client-ui-slots';
/** Explicitly imported so component props carry it (it is already part of PropsRuntime). */
type HeaderUtilProps = PropsRuntime<'conversation.session.header.utilities'>;
type DockProps = PropsRuntime<'conversation.composer.dock'>;
type TurnTailProps = PropsRuntime<'conversation.chat.turnTail'> & {
    matched: {
        turn: number;
    };
};
type TokenViewProps = PropsRuntime<'conversation.view'>;
export declare function PeriodBadge(): React.ReactElement | null;
export declare function OpenOverview(): React.ReactElement | null;
export declare function SessionTotal(props: HeaderUtilProps): React.ReactElement | null;
export declare function DockTokens(props: DockProps): React.ReactElement | null;
export declare function TurnTokens(props: TurnTailProps): React.ReactElement | null;
export declare function TokenView(props: TokenViewProps): React.ReactElement;
export {};
//# sourceMappingURL=components.d.ts.map