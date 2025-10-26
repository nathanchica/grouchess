import { aliasToPieceData } from '../data/pieces.js';
import { NUM_SQUARES } from '../utils/schemas.js';
import type { ChessGame, ChessBoardType, GameRoom, CastleRightsByColor } from '../utils/schemas.js';

type GameRoomId = GameRoom['id'];

/**
 * r | n | b | q | k | b | n | r  (0 - 7)
 * ------------------------------
 * p | p | p | p | p | p | p | p  (8 - 15)
 * ------------------------------
 *   |   |   |   |   |   |   |    (16 - 23)
 * ------------------------------
 *   |   |   |   |   |   |   |    (24 - 31)
 * ------------------------------
 *   |   |   |   |   |   |   |    (32 - 39)
 * ------------------------------
 *   |   |   |   |   |   |   |    (40 - 47)
 * ------------------------------
 * P | P | P | P | P | P | P | P  (48 - 55)
 * ------------------------------
 * R | N | B | Q | K | B | N | R  (56 - 63)
 */
function createInitialBoard(): ChessBoardType {
    const board: ChessBoardType = Array(NUM_SQUARES).fill(undefined);
    Object.values(aliasToPieceData).forEach(({ alias, startingIndices }) => {
        startingIndices.forEach((index) => {
            board[index] = alias;
        });
    });
    return board;
}

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
            board: createInitialBoard(),
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
