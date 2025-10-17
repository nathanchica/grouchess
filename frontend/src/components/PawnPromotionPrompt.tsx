import { useCallback, useEffect } from 'react';

import PromotionCard from './PromotionCard';

import { useChessGame } from '../providers/ChessGameProvider';
import { indexToRowCol, NUM_COLS } from '../utils/board';
import { PAWN_PROMOTION_OPTIONS, type PieceColor, type PawnPromotion } from '../utils/pieces';

type Props = {
    boardRect: DOMRect;
    promotionIndex: number;
    color: PieceColor;
    onDismiss: () => void;
};

function PawnPromotionPrompt({ boardRect, promotionIndex, color, onDismiss }: Props) {
    const { promotePawn, cancelPromotion } = useChessGame();

    const options = PAWN_PROMOTION_OPTIONS[color];
    const { width } = boardRect;
    const squareSize = width / NUM_COLS;
    const { row, col } = indexToRowCol(promotionIndex);
    const top = Math.round(color === 'white' ? row * squareSize : (row - (options.length - 1)) * squareSize);
    const left = Math.round(col * squareSize);

    const handleDismiss = useCallback(() => {
        cancelPromotion();
        onDismiss();
    }, [cancelPromotion, onDismiss]);

    const handleOptionSelect = (option: PawnPromotion) => {
        promotePawn(option);
        onDismiss();
    };

    const handleKeyDownEvent = useCallback(
        (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                handleDismiss();
            }
        },
        [handleDismiss]
    );

    useEffect(() => {
        document.addEventListener('keydown', handleKeyDownEvent);

        return () => {
            document.removeEventListener('keydown', handleKeyDownEvent);
        };
    }, [handleKeyDownEvent]);

    return (
        <div className="absolute inset-0 z-20" onClick={handleDismiss} role="dialog" aria-modal="true" tabIndex={-1}>
            <div className="absolute inset-0 bg-black/40" />
            <PromotionCard
                onSelect={handleOptionSelect}
                options={options}
                squareSize={squareSize}
                style={{ top, left }}
            />
        </div>
    );
}

export default PawnPromotionPrompt;
