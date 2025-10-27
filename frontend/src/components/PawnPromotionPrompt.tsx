import { useCallback } from 'react';

import { indexToRowCol, NUM_COLS, NUM_ROWS, type PieceColor, type PawnPromotion } from '@grouchess/chess';

import PromotionCard from './PromotionCard';

import { useDismissOnEscape } from '../hooks/useDismissOnEscape';
import { useChessGame } from '../providers/ChessGameProvider';
import { PAWN_PROMOTION_OPTIONS } from '../utils/pieces';

type Props = {
    boardRect: DOMRect;
    promotionIndex: number;
    color: PieceColor;
    onDismiss: () => void;
    isFlipped: boolean;
};

function PawnPromotionPrompt({ boardRect, promotionIndex, color, onDismiss, isFlipped }: Props) {
    const { promotePawn, cancelPromotion } = useChessGame();

    const options = PAWN_PROMOTION_OPTIONS[color];
    const { width } = boardRect;
    const squareSize = width / NUM_COLS;
    const { row, col } = indexToRowCol(promotionIndex);

    // When the board is flipped (black's perspective), we need to mirror the
    // row/col to get the on-screen coordinates for the overlay.
    const displayRow = isFlipped ? NUM_ROWS - 1 - row : row;
    const displayCol = isFlipped ? NUM_COLS - 1 - col : col;

    // Position the prompt:
    // - When flipped: anchor at the pawn square and extend downward (matches white UX)
    // - When not flipped: preserve legacy behavior where black extends upward
    const top = Math.round(
        isFlipped
            ? displayRow * squareSize
            : color === 'white'
              ? row * squareSize
              : (row - (options.length - 1)) * squareSize
    );
    const left = Math.round((isFlipped ? displayCol : col) * squareSize);

    // Ensure queen is closest to the pawn. For black on a flipped board, the
    // visual stack extends downward, so reverse the options to put queen first.
    const displayOptions = isFlipped && color === 'black' ? [...options].reverse() : options;

    const handleDismiss = useCallback(() => {
        cancelPromotion();
        onDismiss();
    }, [cancelPromotion, onDismiss]);

    useDismissOnEscape(handleDismiss);

    const handleOptionSelect = (option: PawnPromotion) => {
        promotePawn(option);
        onDismiss();
    };

    return (
        <div className="absolute inset-0 z-20" onClick={handleDismiss} role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="absolute inset-0 bg-black/40" />
            <PromotionCard
                onSelect={handleOptionSelect}
                options={displayOptions}
                squareSize={squareSize}
                style={{ top, left }}
            />
        </div>
    );
}

export default PawnPromotionPrompt;
