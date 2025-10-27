import {
    computeAllLegalMoves,
    computeCastleRightsChangesFromMove,
    computeEnPassantTargetIndex,
    computeNextChessBoardFromMove,
    createInitialChessBoard,
    getColorFromAlias,
    isPromotionSquare,
} from '@grouchess/chess';
import type { ChessBoardState, ChessGame, CastleRightsByColor, PawnPromotion } from '@grouchess/chess';

import { GameNotStartedError, IllegalMoveError, InvalidInputError } from '../utils/errors.js';
import type { GameRoom } from '../utils/schemas.js';

type GameRoomId = GameRoom['id'];

function createInitialCastleRights(): CastleRightsByColor {
    return {
        white: { short: true, long: true },
        black: { short: true, long: true },
    };
}

export class ChessGameService {
    gameRoomIdToChessGameMap: Map<GameRoomId, ChessGame> = new Map();

    createChessGameForRoom(roomId: GameRoomId): ChessGame {
        const boardState: ChessBoardState = {
            board: createInitialChessBoard(),
            playerTurn: 'white',
            castleRightsByColor: createInitialCastleRights(),
            enPassantTargetIndex: null,
            halfmoveClock: 0,
            fullmoveClock: 1,
        };
        const chessGame: ChessGame = {
            boardState,
            legalMovesStore: computeAllLegalMoves(boardState),
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

    movePiece(roomId: GameRoomId, fromIndex: number, toIndex: number, promotion?: PawnPromotion): ChessGame {
        const chessGame = this.getChessGameForRoom(roomId);
        if (!chessGame) {
            throw new GameNotStartedError();
        }
        const { boardState: prevBoardState, legalMovesStore, moveHistory } = chessGame;
        if (!(fromIndex in legalMovesStore.byStartIndex)) {
            throw new IllegalMoveError();
        }
        const legalMove = legalMovesStore.byStartIndex[fromIndex].find(({ endIndex }) => endIndex === toIndex);
        if (!legalMove) {
            throw new IllegalMoveError();
        }
        const move = { ...legalMove };
        const { board: prevBoard, playerTurn, castleRightsByColor, halfmoveClock, fullmoveClock } = prevBoardState;
        const { startIndex, endIndex, type, piece } = move;
        const { type: pieceType, color } = piece;

        const isPawnMove = pieceType === 'pawn';

        // Attach promotion info if applicable
        if (isPawnMove && isPromotionSquare(endIndex, playerTurn)) {
            if (!promotion) {
                throw new InvalidInputError('Promotion piece not specified');
            }
            if (getColorFromAlias(promotion) !== color) {
                throw new InvalidInputError('Promotion piece color does not match pawn color');
            }
            move.promotion = promotion;
        }

        const nextBoard = computeNextChessBoardFromMove(prevBoard, move);

        const rightsDiff = computeCastleRightsChangesFromMove(move);
        const nextCastleRights: CastleRightsByColor = {
            white: { ...castleRightsByColor.white, ...(rightsDiff.white ?? {}) },
            black: { ...castleRightsByColor.black, ...(rightsDiff.black ?? {}) },
        };

        const nextBoardState: ChessBoardState = {
            board: nextBoard,
            playerTurn: playerTurn === 'white' ? 'black' : 'white',
            castleRightsByColor: nextCastleRights,
            enPassantTargetIndex: isPawnMove ? computeEnPassantTargetIndex(startIndex, endIndex) : null,
            halfmoveClock: pieceType === 'pawn' || type === 'capture' ? 0 : halfmoveClock + 1,
            fullmoveClock: playerTurn === 'black' ? fullmoveClock + 1 : fullmoveClock,
        };
        const nextMoveHistory: ChessGame['moveHistory'] = moveHistory; // TODO: Update move history with notations
        const nextChessGame: ChessGame = {
            boardState: nextBoardState,
            legalMovesStore: computeAllLegalMoves(nextBoardState),
            moveHistory: nextMoveHistory,
        };
        this.gameRoomIdToChessGameMap.set(roomId, nextChessGame);
        return nextChessGame;
    }
}
