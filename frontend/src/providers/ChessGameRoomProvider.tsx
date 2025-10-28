import { useCallback, useContext, useMemo, useReducer, createContext, type ReactNode } from 'react';

import {
    computeNextChessBoardFromMove,
    computeNextChessGameAfterMove,
    createChessGameFromFEN,
    createInitialChessGame,
    getPiece,
    INITIAL_CHESS_BOARD_FEN,
    isPromotionSquare,
} from '@grouchess/chess';
import type { EndGameReason, Move, PawnPromotion, PieceColor } from '@grouchess/chess';
import { computePlayerScores } from '@grouchess/game-room';
import type { ChessGameRoom, Message, Player, TimeControl } from '@grouchess/game-room';
import invariant from 'tiny-invariant';

import type { ChessGameUI } from '../utils/types';

type State = {
    chessGame: ChessGameUI | null;
    gameRoom: ChessGameRoom | null;
    currentPlayerId: Player['id'] | null;
};

type Action =
    | { type: 'move-piece'; move: Move }
    | { type: 'promote-pawn'; pawnPromotion: PawnPromotion }
    | { type: 'cancel-promotion' }
    | { type: 'load-fen'; fenString: string }
    | { type: 'end-game'; reason: EndGameReason; winner?: PieceColor }
    | { type: 'start-self-play-room'; timeControlOption: TimeControl | null }
    | { type: 'load-room'; gameRoom: ChessGameRoom; fen?: string }
    | { type: 'clear-room' }
    | { type: 'add-message'; message: Message }
    | { type: 'load-current-player-id'; playerId: Player['id'] };

export type ChessGameContextType = {
    chessGame: ChessGameUI | null;
    movePiece: (move: Move) => void;
    promotePawn: (pawnPromotion: PawnPromotion) => void;
    cancelPromotion: () => void;
    loadFEN: (fenString?: string) => void;
    endGame: (reason: EndGameReason, winner?: PieceColor) => void;
};

export type GameRoomContextType = {
    gameRoom: ChessGameRoom | null;
    currentPlayerId: Player['id'] | null;
    currentPlayerColor: PieceColor | null;
    loadRoom: (gameRoom: ChessGameRoom, fen?: string) => void;
    clearRoom: () => void;
    addMessage: (message: Message) => void;
    loadCurrentPlayerId: (playerId: Player['id']) => void;
    startSelfPlayRoom: (timeControlOption: TimeControl | null) => void;
};

function createInitialState(): State {
    return {
        chessGame: null,
        gameRoom: null,
        currentPlayerId: null,
    };
}

const ChessGameContext = createContext<ChessGameContextType>({
    chessGame: null,
    movePiece: () => {},
    promotePawn: () => {},
    cancelPromotion: () => {},
    loadFEN: () => {},
    endGame: () => {},
});

const GameRoomContext = createContext<GameRoomContextType>({
    gameRoom: null,
    currentPlayerId: null,
    currentPlayerColor: null,
    loadRoom: () => {},
    clearRoom: () => {},
    addMessage: () => {},
    loadCurrentPlayerId: () => {},
    startSelfPlayRoom: () => {},
});

export function useGameRoom(): GameRoomContextType {
    const context = useContext(GameRoomContext);
    invariant(context, 'useGameRoom must be used within ChessGameRoomProvider');
    return context;
}

export function useChessGame(): ChessGameContextType {
    const context = useContext(ChessGameContext);
    invariant(context, 'useChessGame must be used within ChessGameRoomProvider');
    return context;
}

function reducer(state: State, action: Action): State {
    switch (action.type) {
        case 'move-piece': {
            const { move } = action;
            const { chessGame, gameRoom } = state;
            invariant(chessGame && gameRoom, 'No chess game or game room to move piece in');
            const { boardState, previousMoveIndices } = chessGame;
            const { board, playerTurn } = boardState;
            const { startIndex, endIndex, piece, promotion } = move;
            const { type: pieceType } = piece;

            const nextBoard = computeNextChessBoardFromMove(board, move);
            const nextPreviousMoveIndices = [startIndex, endIndex];

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
            invariant(chessGame && gameRoom, 'No chess game or game room to promote pawn in');
            const { pendingPromotion } = chessGame;
            invariant(pendingPromotion, 'No pending promotion to apply');

            const { move, preChessGame } = pendingPromotion;
            const {
                piece: { type: pieceType, color: pieceColor },
            } = move;
            invariant(pieceType === 'pawn', 'Pending promotion move must be a pawn move');
            invariant(pieceColor === getPiece(pawnPromotion).color, 'Promotion piece color must match pawn color');

            const moveWithPromotion: Move = { ...move, promotion: pawnPromotion };
            const nextChessGame = computeNextChessGameAfterMove(preChessGame, moveWithPromotion);

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
            invariant(chessGame, 'No chess game to cancel promotion in');
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
            invariant(gameRoom, 'No game room to load FEN in');
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
            const { chessGame, gameRoom } = state;
            invariant(chessGame && gameRoom, 'No chess game to end or no game room');
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
        case 'start-self-play-room': {
            const { timeControlOption } = action;
            const player1: Player = {
                id: 'player-1',
                displayName: 'White',
            };
            const player2: Player = {
                id: 'player-2',
                displayName: 'Black',
            };
            const players = [player1, player2];

            let playerIdToDisplayName: ChessGameRoom['playerIdToDisplayName'] = {};
            let playerIdToScore: ChessGameRoom['playerIdToScore'] = {};
            players.forEach(({ id, displayName }) => {
                playerIdToDisplayName[id] = displayName;
                playerIdToScore[id] = 0;
            });

            const gameRoom: ChessGameRoom = {
                id: 'game-room',
                type: 'self',
                timeControl: timeControlOption,
                players,
                playerIdToDisplayName,
                playerIdToScore,
                colorToPlayerId: {
                    white: player1.id,
                    black: player2.id,
                },
                messages: [],
                gameCount: 1,
            };
            return {
                ...state,
                chessGame: {
                    ...createInitialChessGame(),
                    timelineVersion: 1,
                    previousMoveIndices: [],
                    pendingPromotion: null,
                },
                gameRoom,
                currentPlayerId: player1.id,
            };
        }
        case 'load-room': {
            const { gameRoom, fen } = action;

            return {
                ...state,
                gameRoom,
                chessGame: fen
                    ? {
                          ...createChessGameFromFEN(fen),
                          timelineVersion: (state.chessGame?.timelineVersion || 0) + 1,
                          previousMoveIndices: [],
                          pendingPromotion: null,
                      }
                    : null,
            };
        }
        case 'clear-room': {
            return {
                ...state,
                chessGame: null,
                gameRoom: null,
                currentPlayerId: null,
            };
        }
        case 'add-message': {
            const { message } = action;
            const { gameRoom } = state;
            invariant(gameRoom, 'No game room to add message to');

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
        default:
            return state;
    }
}

type Props = {
    children: ReactNode;
};

function ChessGameRoomProvider({ children }: Props) {
    const [state, dispatch] = useReducer(reducer, createInitialState());

    const { gameRoom, currentPlayerId } = state;

    const currentPlayerColor = useMemo(() => {
        if (!currentPlayerId || !gameRoom) return null;
        const { colorToPlayerId } = gameRoom;

        let color: PieceColor | null = null;
        if (colorToPlayerId.white === currentPlayerId) {
            color = 'white';
        } else if (colorToPlayerId.black === currentPlayerId) {
            color = 'black';
        }
        return color;
    }, [currentPlayerId, gameRoom]);

    const movePiece = useCallback((move: Move) => {
        dispatch({ type: 'move-piece', move });
    }, []);

    const promotePawn = useCallback((pawnPromotion: PawnPromotion) => {
        dispatch({ type: 'promote-pawn', pawnPromotion });
    }, []);

    const cancelPromotion = useCallback(() => {
        dispatch({ type: 'cancel-promotion' });
    }, []);

    const loadFEN = useCallback((fenString: string = INITIAL_CHESS_BOARD_FEN) => {
        dispatch({ type: 'load-fen', fenString });
    }, []);

    const endGame = useCallback((reason: EndGameReason, winner?: PieceColor) => {
        dispatch({ type: 'end-game', reason, winner });
    }, []);

    const startSelfPlayRoom = useCallback((timeControlOption: TimeControl | null) => {
        dispatch({ type: 'start-self-play-room', timeControlOption });
    }, []);

    const loadRoom = useCallback((gameRoom: ChessGameRoom, fen: string = INITIAL_CHESS_BOARD_FEN) => {
        dispatch({ type: 'load-room', gameRoom, fen });
    }, []);

    const clearRoom = useCallback(() => {
        dispatch({ type: 'clear-room' });
    }, []);

    const addMessage = useCallback((message: Message) => {
        dispatch({ type: 'add-message', message });
    }, []);

    const loadCurrentPlayerId = useCallback((playerId: Player['id']) => {
        dispatch({ type: 'load-current-player-id', playerId });
    }, []);

    const gameRoomContextValue: GameRoomContextType = useMemo(
        () => ({
            gameRoom: state.gameRoom,
            currentPlayerId: state.currentPlayerId,
            currentPlayerColor,
            loadRoom,
            clearRoom,
            addMessage,
            loadCurrentPlayerId,
            startSelfPlayRoom,
        }),
        [
            state.gameRoom,
            state.currentPlayerId,
            currentPlayerColor,
            loadRoom,
            clearRoom,
            addMessage,
            loadCurrentPlayerId,
            startSelfPlayRoom,
        ]
    );

    const chessGameContextValue: ChessGameContextType = useMemo(
        () => ({
            chessGame: state.chessGame,
            movePiece,
            promotePawn,
            cancelPromotion,
            loadFEN,
            endGame,
        }),
        [state.chessGame, movePiece, promotePawn, cancelPromotion, loadFEN, endGame]
    );

    return (
        <GameRoomContext.Provider value={gameRoomContextValue}>
            <ChessGameContext.Provider value={chessGameContextValue}>{children}</ChessGameContext.Provider>
        </GameRoomContext.Provider>
    );
}

export default ChessGameRoomProvider;
