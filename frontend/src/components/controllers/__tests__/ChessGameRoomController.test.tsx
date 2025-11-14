import type { GameEndedPayload } from '@grouchess/socket-events';
import { render } from 'vitest-browser-react';

import { ChessGameContext, type ChessGameContextType } from '../../../providers/ChessGameRoomProvider';
import { SocketContext, type SocketContextType } from '../../../providers/SocketProvider';
import { createMockChessGameContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockSocketContextValues } from '../../../providers/__mocks__/SocketProvider';
import type { SocketType } from '../../../socket';
import ChessGameRoomController from '../ChessGameRoomController';

type RenderChessGameRoomControllerOptions = {
    socketContextValue?: SocketContextType;
    chessGameContextValue?: ChessGameContextType;
};

function renderChessGameRoomController({
    socketContextValue = createMockSocketContextValues(),
    chessGameContextValue = createMockChessGameContextValues(),
}: RenderChessGameRoomControllerOptions = {}) {
    return render(
        <SocketContext.Provider value={socketContextValue}>
            <ChessGameContext.Provider value={chessGameContextValue}>
                <ChessGameRoomController />
            </ChessGameContext.Provider>
        </SocketContext.Provider>
    );
}

describe('ChessGameRoomController', () => {
    describe('socket subscriptions', () => {
        it('subscribes to game_ended on mount and removes listener on unmount', async () => {
            const socketOn = vi.fn();
            const socketOff = vi.fn();
            const socketMock = {
                emit: vi.fn(),
                on: socketOn,
                off: socketOff,
            } as unknown as SocketType;

            const socketContextValue = createMockSocketContextValues();
            socketContextValue.socket = socketMock;

            const { unmount } = await renderChessGameRoomController({
                socketContextValue,
            });

            expect(socketOn).toHaveBeenCalledTimes(1);
            expect(socketOn).toHaveBeenCalledWith('game_ended', expect.any(Function));
            expect(socketOff).not.toHaveBeenCalled();

            const gameEndedHandler = socketOn.mock.calls[0][1];

            unmount();

            expect(socketOff).toHaveBeenCalledTimes(1);
            expect(socketOff).toHaveBeenCalledWith('game_ended', gameEndedHandler);
        });
    });

    describe('game ended handling', () => {
        it('delegates payload data to endGame when socket event fires', async () => {
            const socketOn = vi.fn();
            const socketMock = {
                emit: vi.fn(),
                on: socketOn,
                off: vi.fn(),
            } as unknown as SocketType;
            const endGame = vi.fn();

            const socketContextValue = createMockSocketContextValues();
            socketContextValue.socket = socketMock;

            const chessGameContextValue = createMockChessGameContextValues();
            chessGameContextValue.endGame = endGame;

            await renderChessGameRoomController({
                socketContextValue,
                chessGameContextValue,
            });

            expect(socketOn).toHaveBeenCalledWith('game_ended', expect.any(Function));

            const gameEndedHandler = socketOn.mock.calls[0][1];
            const payload: GameEndedPayload = {
                reason: 'resigned',
                winner: 'black',
                updatedScores: {
                    playerOne: 2,
                    playerTwo: 3,
                },
            };

            gameEndedHandler(payload);

            expect(endGame).toHaveBeenCalledTimes(1);
            expect(endGame).toHaveBeenCalledWith({
                reason: payload.reason,
                winner: payload.winner,
                updatedScores: payload.updatedScores,
            });
        });
    });
});
