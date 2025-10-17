import InfoCard from './InfoCard';

import { useChessGame } from '../providers/ChessGameProvider';
import { useImages } from '../providers/ImagesProvider';
import type { PieceColor } from '../utils/pieces';

type Props = {
    color: PieceColor;
    displayName: string;
};

function PlayerCard({ color, displayName }: Props) {
    const { captures, playerTurn } = useChessGame();
    const { isReady: isImagesLoaded, imgSrcMap } = useImages();
    const ownCaptures = captures
        .filter(({ piece }) => piece.color !== color)
        .sort((a, b) => b.piece.value - a.piece.value);
    const isPlayersTurn = playerTurn === color;

    return (
        <InfoCard
            className={
                isPlayersTurn
                    ? 'ring-2 ring-white/60 transition-all opacity-100 duration-300 ease-in-out'
                    : 'opacity-50'
            }
        >
            <div className="flex flex-col gap-4 p-4">
                <h1 className="text-zinc-100 text-xl">{displayName}</h1>

                <div className="flex flex-row flex-wrap min-h-[3rem]">
                    {isImagesLoaded &&
                        ownCaptures.map(({ piece, moveIndex }) => {
                            const { imgSrc, altText, alias } = piece;
                            return (
                                <img
                                    key={`turn-${moveIndex}-${alias}`}
                                    src={imgSrcMap[imgSrc] ?? imgSrc}
                                    alt={altText}
                                    className="w-12 h-12 drop-shadow-lg"
                                />
                            );
                        })}
                </div>
            </div>
        </InfoCard>
    );
}

export default PlayerCard;
