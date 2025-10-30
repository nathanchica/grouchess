import { computeNextChessGameAfterMove, createInitialChessGame } from '@grouchess/chess';
import type { ChessGame, ChessGameState, PawnPromotion } from '@grouchess/chess';
import type { ChessGameRoom } from '@grouchess/game-room';

import { GameNotStartedError, IllegalMoveError } from '../utils/errors.js';

type GameRoomId = ChessGameRoom['id'];

export class ChessGameService {
    private gameRoomIdToChessGameMap: Map<GameRoomId, ChessGame> = new Map();

    createChessGameForRoom(roomId: GameRoomId): ChessGame {
        const chessGame = createInitialChessGame();
        this.gameRoomIdToChessGameMap.set(roomId, chessGame);
        return chessGame;
    }

    getChessGameForRoom(roomId: GameRoomId): ChessGame | undefined {
        return this.gameRoomIdToChessGameMap.get(roomId);
    }

    deleteChessGameForRoom(roomId: GameRoomId): void {
        this.gameRoomIdToChessGameMap.delete(roomId);
    }

    movePiece(roomId: GameRoomId, fromIndex: number, toIndex: number, promotion?: PawnPromotion): ChessGame {
        const chessGame = this.getChessGameForRoom(roomId);
        if (!chessGame) {
            throw new GameNotStartedError();
        }
        const { legalMovesStore } = chessGame;
        if (!(fromIndex in legalMovesStore.byStartIndex)) {
            throw new IllegalMoveError();
        }
        const legalMove = legalMovesStore.byStartIndex[fromIndex].find(({ endIndex }) => endIndex === toIndex);
        if (!legalMove) {
            throw new IllegalMoveError();
        }
        const move = { ...legalMove, promotion };
        const nextChessGame = computeNextChessGameAfterMove(chessGame, move);

        this.gameRoomIdToChessGameMap.set(roomId, nextChessGame);
        return nextChessGame;
    }

    endGameForRoom(roomId: GameRoomId, gameState: ChessGameState): ChessGame {
        const chessGame = this.getChessGameForRoom(roomId);
        if (!chessGame) {
            throw new GameNotStartedError();
        }

        chessGame.gameState = gameState;
        return chessGame;
    }
}
