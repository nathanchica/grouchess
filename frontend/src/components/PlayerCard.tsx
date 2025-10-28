import { type PieceColor } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import ChessClock from './ChessClock';
import InfoCard from './common/InfoCard';

import { useChessGame, useGameRoom } from '../providers/ChessGameRoomProvider';
import { useImages } from '../providers/ImagesProvider';
import { aliasToPieceImageData } from '../utils/pieces';

type Props = {
    color: PieceColor;
    displayName: string;
};

function PlayerCard({ color, displayName }: Props) {
    const { isReady: isImagesLoaded, imgSrcMap } = useImages();
    const { chessGame } = useChessGame();
    const { gameRoom } = useGameRoom();
    invariant(chessGame && gameRoom, 'chessGame and gameRoom are required for PlayerCard component');
    const { timeControl } = gameRoom;
    const { captures, boardState, gameState } = chessGame;
    const { playerTurn } = boardState;

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
                <section className="grid grid-cols-6 items-start">
                    <h1 className="text-zinc-100 col-span-3 flex items-center gap-2">
                        <span
                            aria-hidden="true"
                            className={`inline-block xl:size-3.5 size-3 rounded-full border-2 ${
                                color === 'white' ? 'bg-white border-slate-800' : 'bg-black border-zinc-100'
                            }`}
                        />
                        {displayName}
                    </h1>

                    {timeControl && <ChessClock isActive={isActive} color={color} />}
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
