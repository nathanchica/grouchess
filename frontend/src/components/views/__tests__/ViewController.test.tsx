import type { GetChessGameResponse } from '@grouchess/http-schemas';
import {
    createMockChessClockState,
    createMockChessGame,
    createMockChessGameRoom,
    createMockTimeControl,
} from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import * as useFetchChessGameModule from '../../../hooks/useFetchChessGame';
import type { FetchChessGameDataParams } from '../../../hooks/useFetchChessGame';
import { AuthContext, type AuthContextType } from '../../../providers/AuthProvider';
import { SocketContext, type SocketContextType } from '../../../providers/SocketProvider';
import { createMockAuthContextValues } from '../../../providers/__mocks__/AuthProvider';
import { createMockSocketContextValues } from '../../../providers/__mocks__/SocketProvider';
import * as chessGameRoomStateModule from '../../../providers/chessGameRoom/state';
import type { ChessGameRoomState } from '../../../providers/chessGameRoom/types';
import type { SocketType } from '../../../socket';
import * as clockUtilsModule from '../../../utils/clock';
import type { ChessGameViewProps } from '../ChessGameView';
import * as MainMenuViewModule from '../MainMenuView';
import type { MainMenuViewProps } from '../MainMenuView';
import ViewController from '../ViewController';

// Mock child components
vi.mock(import('../MainMenuView'), { spy: true });

vi.mock(import('../ChessGameView'), () => ({
    default: ({ initialChessGameRoomData }: ChessGameViewProps) => (
        <div data-testid="chess-game-view">ChessGameView - Room ID: {initialChessGameRoomData.gameRoom.id}</div>
    ),
}));

// Mock hooks
vi.mock(import('../../../hooks/useFetchChessGame'), { spy: true });

// Mock utilities
vi.mock(import('../../../utils/clock'), { spy: true });
vi.mock(import('../../../providers/chessGameRoom/state'), { spy: true });

vi.spyOn(MainMenuViewModule, 'default').mockImplementation(({ onSelfPlayStart }: MainMenuViewProps) => (
    <div data-testid="main-menu-view">
        <button onClick={() => onSelfPlayStart(null)}>Start Self Play</button>
    </div>
));

type RenderViewControllerOptions = {
    authContextValues?: AuthContextType;
    socketContextValues?: SocketContextType;
};

function renderViewController({
    authContextValues = createMockAuthContextValues(),
    socketContextValues = createMockSocketContextValues(),
}: RenderViewControllerOptions = {}) {
    return render(
        <AuthContext.Provider value={authContextValues}>
            <SocketContext.Provider value={socketContextValues}>
                <ViewController />
            </SocketContext.Provider>
        </AuthContext.Provider>
    );
}

describe('ViewController', () => {
    let mockSocket: { on: ReturnType<typeof vi.fn>; off: ReturnType<typeof vi.fn>; emit: ReturnType<typeof vi.fn> };

    beforeEach(() => {
        mockSocket = {
            on: vi.fn(),
            off: vi.fn(),
            emit: vi.fn(),
        };

        vi.spyOn(useFetchChessGameModule, 'useFetchChessGame').mockReturnValue({
            fetchChessGameData: vi.fn(),
            loading: false,
            error: null,
        });

        vi.spyOn(clockUtilsModule, 'rebaseServerClockToPerf').mockImplementation((clockState) => clockState);

        const mockSelfPlayRoomState: ChessGameRoomState = {
            chessGame: {
                ...createMockChessGame(),
                timelineVersion: 1,
                previousMoveIndices: [],
                pendingPromotion: null,
            },
            gameRoom: createMockChessGameRoom({ id: 'self-play-room', type: 'self' }),
            clockState: null,
            messages: [],
            currentPlayerId: 'player-1',
        };

        vi.spyOn(chessGameRoomStateModule, 'createSelfPlayChessGameRoomState').mockReturnValue(mockSelfPlayRoomState);
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    describe('Initial Render', () => {
        it('renders MainMenuView while no chess game data has been loaded', async () => {
            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const { getByTestId } = await renderViewController({ socketContextValues });

            const mainMenuView = getByTestId('main-menu-view');
            await expect.element(mainMenuView).toBeInTheDocument();

            const chessGameView = getByTestId('chess-game-view');
            await expect.element(chessGameView).not.toBeInTheDocument();
        });

        it('renders ChessGameView once initial data is available', async () => {
            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const authContextValues = createMockAuthContextValues({
                token: 'test-token',
                roomId: 'test-room-id',
            });

            const mockGameRoom = createMockChessGameRoom({ id: 'test-room-id' });
            const mockResponse: GetChessGameResponse = {
                chessGame: createMockChessGame(),
                gameRoom: mockGameRoom,
                messages: [],
                playerId: 'player-1',
                clockState: null,
            };

            let capturedOnSuccess: ((data: GetChessGameResponse) => void) | undefined;

            vi.spyOn(useFetchChessGameModule, 'useFetchChessGame').mockReturnValue({
                fetchChessGameData: vi.fn((params: FetchChessGameDataParams) => {
                    capturedOnSuccess = params.onSuccess;
                    return Promise.resolve();
                }),
                loading: false,
                error: null,
            });

            const { getByTestId } = await renderViewController({ authContextValues, socketContextValues });

            // Trigger the socket event
            const gameRoomReadyCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'game_room_ready')?.[1];
            expect(gameRoomReadyCallback).toBeDefined();
            gameRoomReadyCallback();

            // Simulate successful fetch
            expect(capturedOnSuccess).toBeDefined();
            capturedOnSuccess!(mockResponse);

            // Wait for re-render
            await vi.waitFor(async () => {
                const chessGameView = getByTestId('chess-game-view');
                await expect.element(chessGameView).toBeInTheDocument();
            });

            const mainMenuView = getByTestId('main-menu-view');
            await expect.element(mainMenuView).not.toBeInTheDocument();
        });
    });

    describe('Clock State Rebasing', () => {
        it('rebases the server clock state via rebaseServerClockToPerf before storing it', async () => {
            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const authContextValues = createMockAuthContextValues({
                token: 'test-token',
                roomId: 'test-room-id',
            });

            const mockClockState = createMockChessClockState({
                lastUpdatedTimeMs: Date.now(),
            });

            const rebasedClockState = createMockChessClockState({
                lastUpdatedTimeMs: performance.now(),
            });

            const rebaseServerClockToPerfSpy = vi
                .spyOn(clockUtilsModule, 'rebaseServerClockToPerf')
                .mockReturnValue(rebasedClockState);

            const mockGameRoom = createMockChessGameRoom({ id: 'test-room-id' });
            const mockResponse: GetChessGameResponse = {
                chessGame: createMockChessGame(),
                gameRoom: mockGameRoom,
                messages: [],
                playerId: 'player-1',
                clockState: mockClockState,
            };

            let capturedOnSuccess: ((data: GetChessGameResponse) => void) | undefined;

            vi.spyOn(useFetchChessGameModule, 'useFetchChessGame').mockReturnValue({
                fetchChessGameData: vi.fn((params: FetchChessGameDataParams) => {
                    capturedOnSuccess = params.onSuccess;
                    return Promise.resolve();
                }),
                loading: false,
                error: null,
            });

            const { getByTestId } = await renderViewController({ authContextValues, socketContextValues });

            // Trigger the socket event
            const gameRoomReadyCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'game_room_ready')?.[1];
            expect(gameRoomReadyCallback).toBeDefined();
            gameRoomReadyCallback();

            // Simulate successful fetch
            expect(capturedOnSuccess).toBeDefined();
            capturedOnSuccess!(mockResponse);

            // Wait for re-render to complete
            await vi.waitFor(async () => {
                const chessGameView = getByTestId('chess-game-view');
                await expect.element(chessGameView).toBeInTheDocument();
            });

            // Verify rebaseServerClockToPerf was called with the server clock state
            expect(rebaseServerClockToPerfSpy).toHaveBeenCalledWith(mockClockState);
        });
    });

    describe('Fetching Chess Game Data', () => {
        it('calls fetchChessGameData when both token and roomId are available', async () => {
            const fetchChessGameDataMock = vi.fn();

            vi.spyOn(useFetchChessGameModule, 'useFetchChessGame').mockReturnValue({
                fetchChessGameData: fetchChessGameDataMock,
                loading: false,
                error: null,
            });

            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const authContextValues = createMockAuthContextValues({
                token: 'test-token',
                roomId: 'test-room-id',
            });

            await renderViewController({ authContextValues, socketContextValues });

            // Trigger the socket event
            const gameRoomReadyCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'game_room_ready')?.[1];
            expect(gameRoomReadyCallback).toBeDefined();
            gameRoomReadyCallback();

            expect(fetchChessGameDataMock).toHaveBeenCalledWith({
                roomId: 'test-room-id',
                token: 'test-token',
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            });
        });

        it('does not attempt to fetch when either token or roomId is missing', async () => {
            const fetchChessGameDataMock = vi.fn();

            vi.spyOn(useFetchChessGameModule, 'useFetchChessGame').mockReturnValue({
                fetchChessGameData: fetchChessGameDataMock,
                loading: false,
                error: null,
            });

            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const authContextValues = createMockAuthContextValues({
                token: null,
                roomId: 'test-room-id',
            });

            await renderViewController({ authContextValues, socketContextValues });

            // Trigger the socket event
            const gameRoomReadyCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'game_room_ready')?.[1];
            expect(gameRoomReadyCallback).toBeDefined();
            gameRoomReadyCallback();

            expect(fetchChessGameDataMock).not.toHaveBeenCalled();
        });
    });

    describe('Socket Event Subscription', () => {
        it('subscribes to game_room_ready socket events and invokes the fetch callback', async () => {
            const fetchChessGameDataMock = vi.fn();

            vi.spyOn(useFetchChessGameModule, 'useFetchChessGame').mockReturnValue({
                fetchChessGameData: fetchChessGameDataMock,
                loading: false,
                error: null,
            });

            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const authContextValues = createMockAuthContextValues({
                token: 'test-token',
                roomId: 'test-room-id',
            });

            await renderViewController({ authContextValues, socketContextValues });

            // Verify subscription to game_room_ready
            expect(mockSocket.on).toHaveBeenCalledWith('game_room_ready', expect.any(Function));

            // Get the callback and invoke it
            const gameRoomReadyCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'game_room_ready')?.[1];
            expect(gameRoomReadyCallback).toBeDefined();

            gameRoomReadyCallback();

            expect(fetchChessGameDataMock).toHaveBeenCalledWith({
                roomId: 'test-room-id',
                token: 'test-token',
                onSuccess: expect.any(Function),
                onError: expect.any(Function),
            });
        });

        it('unsubscribes from the socket event when the component unmounts', async () => {
            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const { unmount } = await renderViewController({ socketContextValues });

            // Get the callback that was registered
            const gameRoomReadyCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'game_room_ready')?.[1];
            expect(gameRoomReadyCallback).toBeDefined();

            unmount();

            // Verify unsubscription with the same callback
            expect(mockSocket.off).toHaveBeenCalledWith('game_room_ready', gameRoomReadyCallback);
        });
    });

    describe('Error Handling', () => {
        it('logs an error when fetchChessGameData invokes onError', async () => {
            const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            let capturedOnError: ((error: Error) => void) | undefined;

            vi.spyOn(useFetchChessGameModule, 'useFetchChessGame').mockReturnValue({
                fetchChessGameData: vi.fn((params: FetchChessGameDataParams) => {
                    capturedOnError = params.onError;
                    return Promise.resolve();
                }),
                loading: false,
                error: null,
            });

            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const authContextValues = createMockAuthContextValues({
                token: 'test-token',
                roomId: 'test-room-id',
            });

            await renderViewController({ authContextValues, socketContextValues });

            // Trigger the socket event
            const gameRoomReadyCallback = mockSocket.on.mock.calls.find((call) => call[0] === 'game_room_ready')?.[1];
            expect(gameRoomReadyCallback).toBeDefined();
            gameRoomReadyCallback();

            // Simulate error
            expect(capturedOnError).toBeDefined();
            const testError = new Error('Failed to fetch chess game');
            capturedOnError!(testError);

            expect(consoleErrorSpy).toHaveBeenCalledWith('Failed to fetch chess game data:', testError);
        });
    });

    describe('Self Play', () => {
        it('sets initial chess game data when onSelfPlayStart is invoked with null time control', async () => {
            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const mockSelfPlayRoomState: ChessGameRoomState = {
                chessGame: {
                    ...createMockChessGame(),
                    timelineVersion: 1,
                    previousMoveIndices: [],
                    pendingPromotion: null,
                },
                gameRoom: createMockChessGameRoom({ id: 'self-play-room', type: 'self', timeControl: null }),
                clockState: null,
                messages: [],
                currentPlayerId: 'player-1',
            };

            const createSelfPlaySpy = vi
                .spyOn(chessGameRoomStateModule, 'createSelfPlayChessGameRoomState')
                .mockReturnValue(mockSelfPlayRoomState);

            const { getByTestId, getByRole } = await renderViewController({ socketContextValues });

            // Initially showing MainMenuView
            const mainMenuView = getByTestId('main-menu-view');
            await expect.element(mainMenuView).toBeInTheDocument();

            // Click the Start Self Play button
            const startButton = getByRole('button', { name: /start self play/i });
            await startButton.click();

            // Verify createSelfPlayChessGameRoomState was called with null (from the mock button)
            expect(createSelfPlaySpy).toHaveBeenCalledWith(null);

            // Should now show ChessGameView
            await vi.waitFor(async () => {
                const chessGameView = getByTestId('chess-game-view');
                await expect.element(chessGameView).toBeInTheDocument();
            });

            await expect.element(mainMenuView).not.toBeInTheDocument();
        });

        it('creates clock state when onSelfPlayStart is invoked with a time control', async () => {
            const socketContextValues = createMockSocketContextValues();
            socketContextValues.socket = mockSocket as unknown as SocketType;

            const timeControl = createMockTimeControl({ alias: '5|3', minutes: 5, increment: 3 });

            // Change the mock to pass a time control for this test only
            vi.spyOn(MainMenuViewModule, 'default').mockImplementationOnce(({ onSelfPlayStart }: MainMenuViewProps) => (
                <div data-testid="main-menu-view">
                    <button onClick={() => onSelfPlayStart(timeControl)}>Start Self Play With Time</button>
                </div>
            ));

            const mockClockState = createMockChessClockState();

            const mockSelfPlayRoomState: ChessGameRoomState = {
                chessGame: {
                    ...createMockChessGame(),
                    timelineVersion: 1,
                    previousMoveIndices: [],
                    pendingPromotion: null,
                },
                gameRoom: createMockChessGameRoom({ id: 'self-play-room', type: 'self', timeControl }),
                clockState: mockClockState,
                messages: [],
                currentPlayerId: 'player-1',
            };

            vi.spyOn(chessGameRoomStateModule, 'createSelfPlayChessGameRoomState').mockReturnValue(
                mockSelfPlayRoomState
            );

            const { getByTestId, getByRole } = await renderViewController({ socketContextValues });

            const mainMenuView = getByTestId('main-menu-view');
            await expect.element(mainMenuView).toBeInTheDocument();

            // Click the button that will call onSelfPlayStart with a time control
            const startButton = getByRole('button', { name: /start self play with time/i });
            await startButton.click();

            // Should now show ChessGameView with clock state
            await vi.waitFor(async () => {
                const chessGameView = getByTestId('chess-game-view');
                await expect.element(chessGameView).toBeInTheDocument();
            });

            await expect.element(mainMenuView).not.toBeInTheDocument();
        });
    });
});
