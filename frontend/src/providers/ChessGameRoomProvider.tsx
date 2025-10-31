import { useCallback, useContext, useMemo, useReducer, createContext, type ReactNode } from 'react';

import { INITIAL_CHESS_BOARD_FEN } from '@grouchess/chess';
import type { ChessClockState, Move, PawnPromotion, PieceColor } from '@grouchess/chess';
import type { ChessGameRoom, Message, Player, TimeControl } from '@grouchess/game-room';
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
    addMessage: (message: Message) => void;
    loadCurrentPlayerId: (playerId: Player['id']) => void;
    startSelfPlayRoom: (timeControlOption: TimeControl | null) => void;
};

const ChessClockContext = createContext<ChessClockContextType | null>(null);
const ChessGameContext = createContext<ChessGameContextType | null>(null);
const GameRoomContext = createContext<GameRoomContextType | null>(null);

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

    const addMessage = useCallback((message: Message) => {
        dispatch({ type: 'add-message', message });
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
            addMessage,
            loadCurrentPlayerId,
            startSelfPlayRoom,
        }),
        [
            state.gameRoom,
            state.currentPlayerId,
            currentPlayerColor,
            loadRoom,
            addMessage,
            loadCurrentPlayerId,
            startSelfPlayRoom,
        ]
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
