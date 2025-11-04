import { useCallback, useContext, useMemo, useReducer, createContext, type ReactNode } from 'react';

import { INITIAL_CHESS_BOARD_FEN } from '@grouchess/chess';
import type {
    ChessClockState,
    ChessGameRoom,
    Move,
    PawnPromotion,
    PieceColor,
    Player,
    TimeControl,
} from '@grouchess/models';
import invariant from 'tiny-invariant';

import { chessGameRoomReducer } from './chessGameRoom/reducer';
import type { ChessGameRoomState, EndGameInput } from './chessGameRoom/types';

import type { ChessGameUI } from '../utils/types';

export type ChessClockContextType = {
    clockState: ChessClockState | null;
    setClocks: (clockState: ChessClockState | null) => void;
    resetClocks: () => void;
};

export type ChessGameContextType = {
    chessGame: ChessGameUI;
    movePiece: (move: Move) => void;
    promotePawn: (pawnPromotion: PawnPromotion) => void;
    cancelPromotion: () => void;
    loadFEN: (fenString?: string) => void;
    endGame: (input: EndGameInput) => void;
};

export type GameRoomContextType = {
    gameRoom: ChessGameRoom;
    currentPlayerId: Player['id'];
    currentPlayerColor: PieceColor;
    loadRoom: (gameRoom: ChessGameRoom, fen?: string) => void;
    loadCurrentPlayerId: (playerId: Player['id']) => void;
    startSelfPlayRoom: (timeControlOption: TimeControl | null) => void;
};

export const defaultChessClockContextValue: ChessClockContextType = {
    clockState: null,
    setClocks: () => {},
    resetClocks: () => {},
};

export const defaultChessGameContextValue: ChessGameContextType = {
    chessGame: {
        boardState: {
            board: [],
            playerTurn: 'white',
            halfmoveClock: 0,
            fullmoveClock: 1,
            enPassantTargetIndex: null,
            castleRightsByColor: {
                white: {
                    short: true,
                    long: true,
                },
                black: {
                    short: true,
                    long: true,
                },
            },
        },
        legalMovesStore: {
            allMoves: [],
            byStartIndex: {},
            typeAndEndIndexToStartIndex: {},
        },
        moveHistory: [],
        captures: [],
        gameState: {
            status: 'in-progress',
        },
        positionCounts: {},
        previousMoveIndices: [],
        timelineVersion: 0,
        pendingPromotion: null,
    },
    movePiece: () => {},
    promotePawn: () => {},
    cancelPromotion: () => {},
    loadFEN: () => {},
    endGame: () => {},
};

export const defaultGameRoomContextValue: GameRoomContextType = {
    gameRoom: {
        id: '',
        players: [],
        colorToPlayerId: {
            white: '',
            black: '',
        },
        timeControl: null,
        type: 'self',
        playerIdToDisplayName: {},
        playerIdToScore: {},
        gameCount: 0,
    },
    currentPlayerId: '',
    currentPlayerColor: 'white',
    loadRoom: () => {},
    loadCurrentPlayerId: () => {},
    startSelfPlayRoom: () => {},
};

const ChessClockContext = createContext<ChessClockContextType>(defaultChessClockContextValue);
const ChessGameContext = createContext<ChessGameContextType>(defaultChessGameContextValue);
const GameRoomContext = createContext<GameRoomContextType>(defaultGameRoomContextValue);

export function useChessClock(): ChessClockContextType {
    const context = useContext(ChessClockContext);
    invariant(context, 'useChessClock must be used within ChessGameRoomProvider');
    return context;
}

export function useChessGame(): ChessGameContextType {
    const context = useContext(ChessGameContext);
    invariant(context, 'useChessGame must be used within ChessGameRoomProvider');
    return context;
}

export function useGameRoom(): GameRoomContextType {
    const context = useContext(GameRoomContext);
    invariant(context, 'useGameRoom must be used within ChessGameRoomProvider');
    return context;
}

type Props = {
    initialData: ChessGameRoomState;
    children: ReactNode;
};

function ChessGameRoomProvider({ initialData, children }: Props) {
    const [state, dispatch] = useReducer(chessGameRoomReducer, initialData);

    const { gameRoom, currentPlayerId } = state;

    const currentPlayerColor = useMemo(() => {
        const { colorToPlayerId } = gameRoom;

        let color: PieceColor | null = null;
        if (colorToPlayerId.white === currentPlayerId) {
            color = 'white';
        } else if (colorToPlayerId.black === currentPlayerId) {
            color = 'black';
        }
        invariant(color, 'Current player color not found');
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

    const endGame = useCallback((input: EndGameInput) => {
        dispatch({ type: 'end-game', input });
    }, []);

    const startSelfPlayRoom = useCallback((timeControlOption: TimeControl | null) => {
        dispatch({ type: 'start-self-play-room', timeControlOption });
    }, []);

    const loadRoom = useCallback((gameRoom: ChessGameRoom, fen: string = INITIAL_CHESS_BOARD_FEN) => {
        dispatch({ type: 'load-room', gameRoom, fen });
    }, []);

    const loadCurrentPlayerId = useCallback((playerId: Player['id']) => {
        dispatch({ type: 'load-current-player-id', playerId });
    }, []);

    const resetClocks = useCallback(() => {
        dispatch({ type: 'reset-clocks' });
    }, []);

    const setClocks = useCallback((clockState: ChessClockState | null) => {
        dispatch({ type: 'set-clocks', clockState });
    }, []);

    const chessClockContextValue: ChessClockContextType = useMemo(
        () => ({
            clockState: state.clockState,
            resetClocks,
            setClocks,
        }),
        [state.clockState, resetClocks, setClocks]
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

    const gameRoomContextValue: GameRoomContextType = useMemo(
        () => ({
            gameRoom: state.gameRoom,
            currentPlayerId: state.currentPlayerId,
            currentPlayerColor,
            loadRoom,
            loadCurrentPlayerId,
            startSelfPlayRoom,
        }),
        [state.gameRoom, state.currentPlayerId, currentPlayerColor, loadRoom, loadCurrentPlayerId, startSelfPlayRoom]
    );

    return (
        <GameRoomContext.Provider value={gameRoomContextValue}>
            <ChessGameContext.Provider value={chessGameContextValue}>
                <ChessClockContext.Provider value={chessClockContextValue}>{children}</ChessClockContext.Provider>
            </ChessGameContext.Provider>
        </GameRoomContext.Provider>
    );
}

export default ChessGameRoomProvider;

// For convenience re-exports
export type { ChessGameRoomState } from './chessGameRoom/types';
export { createSelfPlayChessGameRoomState } from './chessGameRoom/state';
