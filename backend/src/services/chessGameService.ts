import { createInitialChessBoard } from '@grouchess/chess';
import type { ChessGame, CastleRightsByColor } from '@grouchess/chess';

import type { GameRoom } from '../utils/schemas.js';

type GameRoomId = GameRoom['id'];

function createInitialCastleRights(): CastleRightsByColor {
    return {
        white: { canShortCastle: true, canLongCastle: true },
        black: { canShortCastle: true, canLongCastle: true },
    };
}

export class ChessGameService {
    gameRoomIdToChessGameMap: Map<GameRoomId, ChessGame> = new Map();

    createChessGameForRoom(roomId: GameRoomId): ChessGame {
        const chessGame: ChessGame = {
            board: createInitialChessBoard(),
            playerTurn: 'white',
            castleRightsByColor: createInitialCastleRights(),
            enPassantTargetIndex: null,
            halfMoveClock: 0,
            fullMoveNumber: 1,
            moveHistory: [],
        };
        this.gameRoomIdToChessGameMap.set(roomId, chessGame);
        return chessGame;
    }

    getChessGameForRoom(roomId: GameRoomId): ChessGame | undefined {
        return this.gameRoomIdToChessGameMap.get(roomId);
    }

    deleteChessGameForRoom(roomId: GameRoomId): void {
        this.gameRoomIdToChessGameMap.delete(roomId);
    }

    movePiece(roomId: GameRoomId, fromIndex: number, toIndex: number): boolean {
        const chessGame = this.getChessGameForRoom(roomId);
        if (!chessGame) {
            return false;
        }
        // Implement move logic here. For now, just log the move.
        console.log(`Moving piece in room ${roomId} from ${fromIndex} to ${toIndex}`);
        throw new Error('Not yet implemented');
    }
}
