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
    const top = Math.round(color === 'white' ? row * squareSize : (row - 3) * squareSize);
    const left = Math.round(col * squareSize);

    const handleDismiss = () => {
        cancelPromotion();
        onDismiss();
    };

    const handleOptionSelect = (option: PawnPromotion) => {
        promotePawn(option);
    };

    return (
        <div className="absolute inset-0 z-20" onClick={handleDismiss}>
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
