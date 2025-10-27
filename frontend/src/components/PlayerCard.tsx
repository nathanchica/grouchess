import type { PieceColor } from '@grouchess/chess';

import InfoCard from './common/InfoCard';

import { useChessGame } from '../providers/ChessGameProvider';
import { useImages } from '../providers/ImagesProvider';
import { aliasToPieceImageData } from '../utils/pieces';

type Props = {
    color: PieceColor;
    displayName: string;
};

function PlayerCard({ color, displayName }: Props) {
    const { captures, playerTurn, gameState } = useChessGame();
    const { isReady: isImagesLoaded, imgSrcMap } = useImages();
    const ownCaptures = captures
        .filter(({ piece }) => piece.color !== color)
        .sort((a, b) => b.piece.value - a.piece.value);
    const isPlayersTurn = playerTurn === color;

    const { status } = gameState;

    const isGameOver = status !== 'in-progress';
    const isActive = isPlayersTurn || isGameOver;

    return (
        <InfoCard
            className={`${isActive ? 'ring-2 ring-white/60 transition-all opacity-100 duration-300 ease-in-out' : 'opacity-50'} w-full`}
        >
            <div className="flex flex-col gap-4 xl:p-3 p-2">
                <section className="grid grid-cols-6 items-center">
                    <h1 className="text-zinc-100 xl:text-xl col-span-4 flex items-baseline gap-2">
                        <span
                            aria-hidden="true"
                            className={`inline-block xl:w-3.5 xl:h-3.5 w-3 h-3 rounded-full border-2 ${
                                color === 'white' ? 'bg-white border-slate-800' : 'bg-black border-zinc-100'
                            }`}
                        />
                        {displayName}
                    </h1>

                    <span
                        className={`col-span-2 cursor-default text-zinc-300 text-center text-lg  font-bold tracking-widest py-1 rounded-lg ${isActive && 'bg-zinc-600'}`}
                    >
                        5:00
                    </span>
                </section>

                <div className="flex flex-row flex-wrap min-h-[3rem]">
                    {isImagesLoaded &&
                        ownCaptures.map(({ piece, moveIndex }) => {
                            const { alias } = piece;
                            const { imgSrc, altText } = aliasToPieceImageData[alias];

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
