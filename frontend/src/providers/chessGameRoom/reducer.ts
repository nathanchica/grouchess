import {
    computeNextChessBoardFromMove,
    computeNextChessGameAfterMove,
    createChessGameFromFEN,
    getPiece,
    hasInsufficientMatingMaterial,
    isPromotionSquare,
    updateClockState,
    type EndGameReason,
    type PieceColor,
} from '@grouchess/chess';
import { computePlayerScores } from '@grouchess/game-room';
import invariant from 'tiny-invariant';

import { createInitialChessClockState, createSelfPlayChessGameRoomState } from './state';
import type { ChessGameRoomState, Action } from './types';

import type { ChessGameUI } from '../../utils/types';

export function chessGameRoomReducer(state: ChessGameRoomState, action: Action): ChessGameRoomState {
    function endGame(reason: EndGameReason, winner?: PieceColor): ChessGameRoomState {
        const { chessGame, gameRoom } = state;
        const newGameState: ChessGameUI['gameState'] = {
            ...chessGame.gameState,
            status: reason,
            winner,
        };

        return {
            ...state,
            chessGame: {
                ...chessGame,
                gameState: newGameState,
            },
            gameRoom: {
                ...gameRoom,
                playerIdToScore: computePlayerScores(gameRoom, newGameState),
            },
        };
    }

    switch (action.type) {
        case 'move-piece': {
            const { move } = action;
            const { chessGame, gameRoom, clockState } = state;
            const { boardState, previousMoveIndices } = chessGame;
            const { board, playerTurn } = boardState;
            const { startIndex, endIndex, piece, promotion } = move;
            const { type: pieceType } = piece;

            const nextBoard = computeNextChessBoardFromMove(board, move);
            const nextPreviousMoveIndices = [startIndex, endIndex] as [number, number];

            // end game if time expired just in case
            if (clockState) {
                const updatedClockState = updateClockState(clockState, performance.now());
                const activeColor = playerTurn;
                const activeClock = activeColor === 'white' ? updatedClockState.white : updatedClockState.black;
                if (activeClock.timeRemainingMs <= 0) {
                    const winner = activeColor === 'white' ? 'black' : 'white';
                    const board = chessGame.boardState.board;
                    const opponentCanMate = !hasInsufficientMatingMaterial(board, winner);

                    if (opponentCanMate) {
                        return endGame('time-out', winner);
                    } else {
                        return endGame('insufficient-material');
                    }
                }
            }

            // If pawn reached last rank, pause to await promotion choice
            const isPawnMove = pieceType === 'pawn';
            if (isPawnMove && isPromotionSquare(endIndex, playerTurn) && !promotion) {
                // Do not update captures/moveHistory/playerTurn yet; finalize after promotion
                return {
                    ...state,
                    chessGame: {
                        ...chessGame,
                        boardState: {
                            ...boardState,
                            board: nextBoard,
                        },
                        previousMoveIndices: nextPreviousMoveIndices,
                        pendingPromotion: {
                            move,
                            preChessGame: chessGame,
                            prePreviousMoveIndices: previousMoveIndices,
                        },
                    },
                };
            }

            const nextChessGame = computeNextChessGameAfterMove(chessGame, move);

            return {
                ...state,
                chessGame: {
                    ...chessGame,
                    ...nextChessGame,
                    previousMoveIndices: nextPreviousMoveIndices,
                },
                gameRoom: {
                    ...gameRoom,
                    playerIdToScore: computePlayerScores(gameRoom, nextChessGame.gameState),
                },
            };
        }
        case 'promote-pawn': {
            const { pawnPromotion } = action;
            const { chessGame, gameRoom } = state;
            const { pendingPromotion } = chessGame;
            invariant(pendingPromotion, 'No pending promotion to apply');

            const { move, preChessGame } = pendingPromotion;
            const {
                piece: { type: pieceType, color: pieceColor },
            } = move;
            invariant(pieceType === 'pawn', 'Pending promotion move must be a pawn move');
            invariant(pieceColor === getPiece(pawnPromotion).color, 'Promotion piece color must match pawn color');

            const nextChessGame = computeNextChessGameAfterMove(preChessGame, { ...move, promotion: pawnPromotion });

            return {
                ...state,
                chessGame: {
                    ...chessGame,
                    ...nextChessGame,
                    pendingPromotion: null,
                },
                gameRoom: {
                    ...gameRoom,
                    playerIdToScore: computePlayerScores(gameRoom, nextChessGame.gameState),
                },
            };
        }
        case 'cancel-promotion': {
            const { chessGame } = state;
            const { pendingPromotion } = chessGame;
            invariant(pendingPromotion, 'No pending promotion to cancel');
            const { preChessGame, prePreviousMoveIndices } = pendingPromotion;
            return {
                ...state,
                chessGame: {
                    ...chessGame,
                    boardState: {
                        ...chessGame.boardState,
                        board: preChessGame.boardState.board,
                    },
                    previousMoveIndices: prePreviousMoveIndices,
                    pendingPromotion: null,
                },
            };
        }
        case 'load-fen': {
            const { gameRoom } = state;
            return {
                ...state,
                chessGame: {
                    ...createChessGameFromFEN(action.fenString),
                    timelineVersion: (state.chessGame?.timelineVersion || 0) + 1,
                    previousMoveIndices: [],
                    pendingPromotion: null,
                },
                gameRoom: {
                    ...gameRoom,
                    gameCount: gameRoom.gameCount + 1,
                },
            };
        }
        case 'end-game': {
            const { reason, winner } = action;
            return endGame(reason, winner);
        }
        case 'start-self-play-room': {
            const { timeControlOption } = action;
            return createSelfPlayChessGameRoomState(timeControlOption);
        }
        case 'load-room': {
            const { gameRoom, fen } = action;

            return {
                ...state,
                gameRoom,
                ...(fen
                    ? {
                          chessGame: {
                              ...createChessGameFromFEN(fen),
                              timelineVersion: state.chessGame.timelineVersion + 1,
                              previousMoveIndices: [],
                              pendingPromotion: null,
                          },
                      }
                    : {}),
            };
        }
        case 'add-message': {
            const { message } = action;
            const { gameRoom } = state;

            const newMessage = {
                ...message,
                createdAt: new Date(message.createdAt),
            };
            // Keep messages sorted by oldest to newest
            const sortedMessages = [...gameRoom.messages, newMessage].sort(
                (a, b) => a.createdAt.getTime() - b.createdAt.getTime()
            );

            return {
                ...state,
                gameRoom: {
                    ...gameRoom,
                    messages: sortedMessages,
                },
            };
        }
        case 'load-current-player-id': {
            const { playerId } = action;
            return {
                ...state,
                currentPlayerId: playerId,
            };
        }
        case 'reset-clocks': {
            const { gameRoom } = state;
            const { timeControl } = gameRoom;
            return {
                ...state,
                clockState: timeControl ? createInitialChessClockState(timeControl) : null,
            };
        }
        case 'set-clocks': {
            const { clockState } = action;
            return {
                ...state,
                clockState,
            };
        }
        default:
            return state;
    }
}
