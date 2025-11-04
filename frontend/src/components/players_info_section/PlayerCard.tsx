import { type PieceColor } from '@grouchess/models';
import invariant from 'tiny-invariant';

import ChessClock from './ChessClock';
import PlayerScoreDisplay from './PlayerScoreDisplay';

import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';
import { useImages } from '../../providers/ImagesProvider';
import { aliasToPieceImageData } from '../../utils/pieces';
import InfoCard from '../common/InfoCard';

type Props = {
    playerId: string;
    color: PieceColor;
    displayName: string;
};

function PlayerCard({ playerId, color, displayName }: Props) {
    const { isReady: isImagesLoaded, imgSrcMap } = useImages();
    const { chessGame } = useChessGame();
    const { gameRoom } = useGameRoom();
    invariant(chessGame && gameRoom, 'chessGame and gameRoom are required for PlayerCard component');
    const { timeControl, playerIdToScore } = gameRoom;
    const { captures, boardState, gameState } = chessGame;
    const { playerTurn } = boardState;

    const ownCaptures = captures
        .filter(({ piece }) => piece.color !== color)
        .sort((a, b) => b.piece.value - a.piece.value);
    const isPlayersTurn = playerTurn === color;

    const { status } = gameState;

    const isGameOver = status !== 'in-progress';
    const isActive = isPlayersTurn || isGameOver;
    const showScores = Object.values(playerIdToScore).some((score) => score > 0);

    return (
        <InfoCard
            className={`${isActive ? 'ring-2 ring-white/60 transition-all opacity-100 duration-300 ease-in-out' : 'opacity-50'} w-full`}
        >
            <div className="flex flex-col gap-4 p-2">
                <section className="flex flex-row gap-2 items-center justify-between flex-nowrap">
                    <PlayerScoreDisplay
                        name={displayName}
                        score={showScores ? playerIdToScore[playerId] : undefined}
                        color={color}
                    />

                    {timeControl && (
                        <div className="shrink-0">
                            <ChessClock isActive={isActive} color={color} />
                        </div>
                    )}
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
