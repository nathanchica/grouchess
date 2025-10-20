import InfoCard from './InfoCard';

import { useChessGame } from '../providers/ChessGameProvider';
import { useImages } from '../providers/ImagesProvider';
import { getDisplayTextForDrawStatus, isDrawStatus } from '../utils/draws';
import type { PieceColor } from '../utils/pieces';

type Props = {
    color: PieceColor;
    displayName: string;
};

function PlayerCard({ color, displayName }: Props) {
    const { captures, playerTurn, gameStatus } = useChessGame();
    const { isReady: isImagesLoaded, imgSrcMap } = useImages();
    const ownCaptures = captures
        .filter(({ piece }) => piece.color !== color)
        .sort((a, b) => b.piece.value - a.piece.value);
    const isPlayersTurn = playerTurn === color;

    const { status, winner } = gameStatus;

    const isGameOver = status !== 'in-progress';
    const isActive = isPlayersTurn || isGameOver;

    let statusText;
    if (winner === color) {
        statusText = 'Winner by checkmate';
    } else if (status === 'draw-by-agreement') {
        statusText = 'Draw by agreement';
    } else if (isDrawStatus(status)) {
        statusText = `Draw by ${getDisplayTextForDrawStatus(status)}`;
    }

    return (
        <InfoCard
            className={
                isActive ? 'ring-2 ring-white/60 transition-all opacity-100 duration-300 ease-in-out' : 'opacity-50'
            }
        >
            <div className="flex flex-col gap-4 xl:p-4 p-2">
                <h1 className="text-zinc-100 xl:text-xl flex items-baseline gap-2">
                    <span
                        aria-hidden="true"
                        className={`inline-block xl:w-3.5 xl:h-3.5 w-3 h-3 rounded-full border-2 ${
                            color === 'white' ? 'bg-white border-slate-800' : 'bg-black border-zinc-100'
                        }`}
                    />
                    {displayName}
                </h1>
                {statusText && (
                    <span className="text-xs font-semibold tracking-[0.3em] uppercase text-zinc-400">{statusText}</span>
                )}

                <div className="flex flex-row flex-wrap min-h-[3rem]">
                    {isImagesLoaded &&
                        ownCaptures.map(({ piece, moveIndex }) => {
                            const { imgSrc, altText, alias } = piece;
                            return (
                                <img
                                    key={`turn-${moveIndex}-${alias}`}
                                    src={imgSrcMap[imgSrc] ?? imgSrc}
                                    alt={altText}
                                    className="w-9 h-9 drop-shadow-lg"
                                />
                            );
                        })}
                </div>
            </div>
        </InfoCard>
    );
}

export default PlayerCard;
