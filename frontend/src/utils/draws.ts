import type { ChessGameStatus } from '@grouchess/models';
import invariant from 'tiny-invariant';

const DRAW_STATUS_TO_DISPLAY_TEXT: Partial<Record<ChessGameStatus, string>> = {
    stalemate: 'Stalemate',
    '50-move-draw': '50-Move Draw',
    'threefold-repetition': 'Threefold Repetition',
    'draw-by-agreement': 'Draw by Agreement',
    'insufficient-material': 'Insufficient Material',
};

export function getDisplayTextForDrawStatus(status: ChessGameStatus): string {
    invariant(status in DRAW_STATUS_TO_DISPLAY_TEXT, `Status '${status}' is not a draw status`);
    return DRAW_STATUS_TO_DISPLAY_TEXT[status] as string;
}
