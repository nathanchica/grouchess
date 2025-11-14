import type { BoardIndex, PawnPromotion, PieceColor } from '@grouchess/models';
import { createMockLegalMovesStore, createMockMove, createMockMoveRecord } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import {
    ChessGameContext,
    type ChessGameContextType,
    GameRoomContext,
    type GameRoomContextType,
} from '../../../providers/ChessGameRoomProvider';
import { SocketContext, type SocketContextType } from '../../../providers/SocketProvider';
import {
    createMockChessGameContextValues,
    createMockGameRoomContextValues,
} from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockSocketContextValues } from '../../../providers/__mocks__/SocketProvider';
import type { SocketType } from '../../../socket';
import ChessMovesController from '../ChessMovesController';

type RenderChessMovesControllerOptions = {
    socketContextValue?: SocketContextType;
    chessGameContextValue?: ChessGameContextType;
    gameRoomContextValue?: GameRoomContextType;
};

async function renderChessMovesController(initialOptions: RenderChessMovesControllerOptions = {}) {
    const buildProviders = ({
        socketContextValue = createMockSocketContextValues(),
        chessGameContextValue = createMockChessGameContextValues(),
        gameRoomContextValue = createMockGameRoomContextValues(),
    }: RenderChessMovesControllerOptions = {}) => (
        <SocketContext.Provider value={socketContextValue}>
            <GameRoomContext.Provider value={gameRoomContextValue}>
                <ChessGameContext.Provider value={chessGameContextValue}>
                    <ChessMovesController />
                </ChessGameContext.Provider>
            </GameRoomContext.Provider>
        </SocketContext.Provider>
    );

    const renderResult = await render(buildProviders(initialOptions));

    const rerenderChessMovesController = (nextOptions: RenderChessMovesControllerOptions = initialOptions) => {
        renderResult.rerender(buildProviders(nextOptions));
    };

    return {
        ...renderResult,
        rerenderChessMovesController,
    };
}

function createMoveRecordForColor({
    color = 'white',
    startIndex = 12 as BoardIndex,
    endIndex = 20 as BoardIndex,
    promotion,
}: {
    color?: PieceColor;
    startIndex?: BoardIndex;
    endIndex?: BoardIndex;
    promotion?: PawnPromotion;
} = {}) {
    return createMockMoveRecord({
        move: createMockMove({
            startIndex,
            endIndex,
            promotion,
            piece: {
                alias: color === 'white' ? 'P' : 'p',
                color,
                type: 'pawn',
                value: 1,
            },
        }),
    });
}

describe('ChessMovesController', () => {
    it('subscribes to piece_moved events and cleans up on unmount', async () => {
        const socketOn = vi.fn();
        const socketOff = vi.fn();
        const socketMock = {
            emit: vi.fn(),
            on: socketOn,
            off: socketOff,
        } as unknown as SocketType;

        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = socketMock;

        const { unmount } = await renderChessMovesController({ socketContextValue });

        expect(socketOn).toHaveBeenCalledTimes(1);
        expect(socketOn).toHaveBeenCalledWith('piece_moved', expect.any(Function));
        expect(socketOff).not.toHaveBeenCalled();

        const handler = socketOn.mock.calls[0][1];

        unmount();

        expect(socketOff).toHaveBeenCalledTimes(1);
        expect(socketOff).toHaveBeenCalledWith('piece_moved', handler);
    });

    it('dispatches movePiece when the server sends a legal move', async () => {
        const movePiece = vi.fn();
        const move = createMockMove({
            startIndex: 10 as BoardIndex,
            endIndex: 18 as BoardIndex,
        });

        const chessGameContextValue = createMockChessGameContextValues();
        chessGameContextValue.movePiece = movePiece;
        chessGameContextValue.chessGame.legalMovesStore = createMockLegalMovesStore({
            byStartIndex: {
                [move.startIndex]: [move],
            },
        });
        chessGameContextValue.chessGame.moveHistory = [];

        const socketOn = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: vi.fn(),
            on: socketOn,
            off: vi.fn(),
        } as unknown as SocketType;

        await renderChessMovesController({ socketContextValue, chessGameContextValue });

        const handler = socketOn.mock.calls[0][1];
        const promotion: PawnPromotion = 'q';
        handler({ fromIndex: move.startIndex, toIndex: move.endIndex, promotion });

        expect(movePiece).toHaveBeenCalledTimes(1);
        expect(movePiece).toHaveBeenCalledWith({ ...move, promotion });
    });

    it('warns when a move is not legal', async () => {
        const movePiece = vi.fn();
        const chessGameContextValue = createMockChessGameContextValues();
        chessGameContextValue.movePiece = movePiece;
        chessGameContextValue.chessGame.legalMovesStore = createMockLegalMovesStore();
        chessGameContextValue.chessGame.moveHistory = [];

        const socketOn = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: vi.fn(),
            on: socketOn,
            off: vi.fn(),
        } as unknown as SocketType;

        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

        await renderChessMovesController({ socketContextValue, chessGameContextValue });

        const handler = socketOn.mock.calls[0][1];
        const payload = { fromIndex: 5, toIndex: 12, promotion: undefined };
        handler(payload);

        expect(movePiece).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith('Received illegal move from server:', payload);

        warnSpy.mockRestore();
    });

    it('ignores payloads when the legal moves store is missing', async () => {
        const movePiece = vi.fn();
        const chessGameContextValue = createMockChessGameContextValues();
        chessGameContextValue.movePiece = movePiece;
        chessGameContextValue.chessGame.legalMovesStore = null as unknown as ReturnType<
            typeof createMockLegalMovesStore
        >;

        const socketOn = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: vi.fn(),
            on: socketOn,
            off: vi.fn(),
        } as unknown as SocketType;

        await renderChessMovesController({ socketContextValue, chessGameContextValue });

        const handler = socketOn.mock.calls[0][1];
        handler({ fromIndex: 0, toIndex: 1, promotion: undefined });

        expect(movePiece).not.toHaveBeenCalled();
    });

    it('refreshes the legal moves store ref so socket handlers use the latest moves', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const movePiece = vi.fn();
        const firstStore = createMockLegalMovesStore();
        const secondMove = createMockMove({ startIndex: 4 as BoardIndex, endIndex: 12 as BoardIndex });
        const updatedStore = createMockLegalMovesStore({
            byStartIndex: {
                [secondMove.startIndex]: [secondMove],
            },
        });

        const chessGameContextValue = createMockChessGameContextValues();
        chessGameContextValue.movePiece = movePiece;
        chessGameContextValue.chessGame.legalMovesStore = firstStore;

        const socketOn = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: vi.fn(),
            on: socketOn,
            off: vi.fn(),
        } as unknown as SocketType;

        const { rerenderChessMovesController } = await renderChessMovesController({
            socketContextValue,
            chessGameContextValue,
        });

        const handler = socketOn.mock.calls[0][1];
        handler({ fromIndex: secondMove.startIndex, toIndex: secondMove.endIndex, promotion: undefined });
        expect(movePiece).not.toHaveBeenCalled();

        chessGameContextValue.chessGame.legalMovesStore = updatedStore;
        rerenderChessMovesController({ socketContextValue, chessGameContextValue });

        handler({ fromIndex: secondMove.startIndex, toIndex: secondMove.endIndex, promotion: undefined });
        expect(movePiece).toHaveBeenCalledWith({ ...secondMove, promotion: undefined });
        expect(warnSpy).toHaveBeenCalledWith('Received illegal move from server:', {
            fromIndex: secondMove.startIndex,
            toIndex: secondMove.endIndex,
            promotion: undefined,
        });

        warnSpy.mockRestore();
    });

    it('emits move_piece when the authenticated player makes a move', async () => {
        const socketEmit = vi.fn();
        const socketMock = {
            emit: socketEmit,
            on: vi.fn(),
            off: vi.fn(),
        } as unknown as SocketType;

        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = socketMock;
        socketContextValue.isAuthenticated = true;

        const chessGameContextValue = createMockChessGameContextValues();
        const moveRecord = createMoveRecordForColor({
            color: 'white',
            startIndex: 8 as BoardIndex,
            endIndex: 16 as BoardIndex,
        });
        chessGameContextValue.chessGame.moveHistory = [moveRecord];

        const gameRoomContextValue = createMockGameRoomContextValues();
        gameRoomContextValue.currentPlayerColor = 'white';

        await renderChessMovesController({ socketContextValue, chessGameContextValue, gameRoomContextValue });

        expect(socketEmit).toHaveBeenCalledTimes(1);
        expect(socketEmit).toHaveBeenCalledWith('move_piece', {
            fromIndex: moveRecord.move.startIndex,
            toIndex: moveRecord.move.endIndex,
            promotion: moveRecord.move.promotion,
        });
    });

    it('does not emit move_piece for opponent moves', async () => {
        const socketEmit = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: socketEmit,
            on: vi.fn(),
            off: vi.fn(),
        } as unknown as SocketType;
        socketContextValue.isAuthenticated = true;

        const chessGameContextValue = createMockChessGameContextValues();
        const moveRecord = createMoveRecordForColor({ color: 'black' });
        chessGameContextValue.chessGame.moveHistory = [moveRecord];

        const gameRoomContextValue = createMockGameRoomContextValues();
        gameRoomContextValue.currentPlayerColor = 'white';

        await renderChessMovesController({ socketContextValue, chessGameContextValue, gameRoomContextValue });

        expect(socketEmit).not.toHaveBeenCalled();
    });

    it('retries sending a move once authentication succeeds', async () => {
        const socketEmit = vi.fn();
        const socketMock = {
            emit: socketEmit,
            on: vi.fn(),
            off: vi.fn(),
        } as unknown as SocketType;

        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = socketMock;
        socketContextValue.isAuthenticated = false;

        const chessGameContextValue = createMockChessGameContextValues();
        const moveRecord = createMoveRecordForColor();
        chessGameContextValue.chessGame.moveHistory = [moveRecord];

        const gameRoomContextValue = createMockGameRoomContextValues();
        gameRoomContextValue.currentPlayerColor = 'white';

        const { rerenderChessMovesController } = await renderChessMovesController({
            socketContextValue,
            chessGameContextValue,
            gameRoomContextValue,
        });

        expect(socketEmit).not.toHaveBeenCalled();

        socketContextValue.isAuthenticated = true;
        rerenderChessMovesController({ socketContextValue, chessGameContextValue, gameRoomContextValue });

        expect(socketEmit).toHaveBeenCalledTimes(1);
        expect(socketEmit).toHaveBeenCalledWith('move_piece', {
            fromIndex: moveRecord.move.startIndex,
            toIndex: moveRecord.move.endIndex,
            promotion: moveRecord.move.promotion,
        });
    });

    it('only sends each move once even if renders happen without new moves', async () => {
        const socketEmit = vi.fn();
        const socketContextValue = createMockSocketContextValues();
        socketContextValue.socket = {
            emit: socketEmit,
            on: vi.fn(),
            off: vi.fn(),
        } as unknown as SocketType;
        socketContextValue.isAuthenticated = true;

        const chessGameContextValue = createMockChessGameContextValues();
        const initialMove = createMoveRecordForColor({ startIndex: 6 as BoardIndex, endIndex: 14 as BoardIndex });
        chessGameContextValue.chessGame.moveHistory = [initialMove];

        const gameRoomContextValue = createMockGameRoomContextValues();
        gameRoomContextValue.currentPlayerColor = 'white';

        const { rerenderChessMovesController } = await renderChessMovesController({
            socketContextValue,
            chessGameContextValue,
            gameRoomContextValue,
        });

        expect(socketEmit).toHaveBeenCalledTimes(1);

        chessGameContextValue.chessGame.moveHistory = [initialMove];
        rerenderChessMovesController({ socketContextValue, chessGameContextValue, gameRoomContextValue });
        expect(socketEmit).toHaveBeenCalledTimes(1);

        const duplicateMove = createMoveRecordForColor({
            startIndex: initialMove.move.startIndex,
            endIndex: initialMove.move.endIndex,
        });
        chessGameContextValue.chessGame.moveHistory = [initialMove, duplicateMove];

        rerenderChessMovesController({ socketContextValue, chessGameContextValue, gameRoomContextValue });
        expect(socketEmit).toHaveBeenCalledTimes(1);
    });
});
