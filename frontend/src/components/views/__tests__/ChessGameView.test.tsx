import type { ReactNode } from 'react';

import { createMockChessClockState, createMockChessGameRoom } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { createMockChessGameContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import type { ChessGameRoomState } from '../../../providers/chessGameRoom/types';
import ChessGameView from '../ChessGameView';

// Mock all child components
vi.mock(import('../../chess_board/MainSection'), () => ({
    default: () => <div data-testid="main-section">MainSection</div>,
}));

vi.mock(import('../../../providers/PlayerChatSocketProvider'), () => ({
    default: ({ children }: { children: ReactNode }) => <div data-testid="player-chat-provider">{children}</div>,
}));

// @ts-expect-error - Actual component returns null, but we need a renderable component for testing with data-testid
vi.mock(import('../../controllers/ChessClocksLocalController'), () => ({
    default: () => <div data-testid="clocks-local-controller">ChessClocksLocalController</div>,
}));

// @ts-expect-error - Actual component returns null, but we need a renderable component for testing with data-testid
vi.mock(import('../../controllers/ChessClocksSocketController'), () => ({
    default: () => <div data-testid="clocks-socket-controller">ChessClocksSocketController</div>,
}));

// @ts-expect-error - Actual component returns null, but we need a renderable component for testing with data-testid
vi.mock(import('../../controllers/ChessGameRoomController'), () => ({
    default: () => <div data-testid="game-room-controller">ChessGameRoomController</div>,
}));

// @ts-expect-error - Actual component returns null, but we need a renderable component for testing with data-testid
vi.mock(import('../../controllers/ChessMovesController'), () => ({
    default: () => <div data-testid="moves-controller">ChessMovesController</div>,
}));

// @ts-expect-error - Actual component returns null, but we need a renderable component for testing with data-testid
vi.mock(import('../../controllers/SoundEffects'), () => ({
    default: () => <div data-testid="sound-effects">SoundEffects</div>,
}));

vi.mock(import('../../game_info_panel/GameInfoPanel'), () => ({
    default: () => <div data-testid="game-info-panel">GameInfoPanel</div>,
}));

vi.mock(import('../../players_info_section/PlayersInfoSection'), () => ({
    default: () => <div data-testid="players-info-section">PlayersInfoSection</div>,
}));

function createMockChessGameRoomState(overrides?: Partial<ChessGameRoomState>): ChessGameRoomState {
    const { chessGame: mockChessGame } = createMockChessGameContextValues();
    const currentPlayerId = 'player-1';
    return {
        chessGame: mockChessGame,
        gameRoom: createMockChessGameRoom({
            colorToPlayerId: {
                white: currentPlayerId,
                black: 'player-2',
            },
        }),
        clockState: null,
        messages: [],
        currentPlayerId,
        ...overrides,
    };
}

describe('ChessGameView', () => {
    describe('Rendering', () => {
        it('renders core components and main layout', async () => {
            const initialData = createMockChessGameRoomState();
            const { getByTestId } = await render(<ChessGameView initialChessGameRoomData={initialData} />);

            await expect.element(getByTestId('player-chat-provider')).toBeInTheDocument();
            await expect.element(getByTestId('sound-effects')).toBeInTheDocument();
            await expect.element(getByTestId('game-room-controller')).toBeInTheDocument();
            await expect.element(getByTestId('moves-controller')).toBeInTheDocument();
            await expect.element(getByTestId('main-section')).toBeInTheDocument();

            // GameInfoPanel and PlayersInfoSection are rendered multiple times (for different screen sizes)
            const gameInfoPanels = getByTestId('game-info-panel').elements();
            const playersInfoSections = getByTestId('players-info-section').elements();

            expect(gameInfoPanels.length).toBeGreaterThan(0);
            expect(playersInfoSections.length).toBeGreaterThan(0);
        });
    });

    describe('Chess Clock Controllers', () => {
        it('renders ChessClocksLocalController when a self-play game has a clock state', async () => {
            const clockState = createMockChessClockState();
            const currentPlayerId = 'player-1';
            const gameRoom = createMockChessGameRoom({
                type: 'self',
                colorToPlayerId: {
                    white: currentPlayerId,
                    black: 'player-2',
                },
            });
            const initialData = createMockChessGameRoomState({
                clockState,
                gameRoom,
                currentPlayerId,
            });

            const { getByTestId } = await render(<ChessGameView initialChessGameRoomData={initialData} />);

            await expect.element(getByTestId('clocks-local-controller')).toBeInTheDocument();
        });

        it('renders ChessClocksSocketController when a remote game has a clock state', async () => {
            const clockState = createMockChessClockState();
            const currentPlayerId = 'player-1';
            const gameRoom = createMockChessGameRoom({
                type: 'player-vs-player',
                colorToPlayerId: {
                    white: currentPlayerId,
                    black: 'player-2',
                },
            });
            const initialData = createMockChessGameRoomState({
                clockState,
                gameRoom,
                currentPlayerId,
            });

            const { getByTestId } = await render(<ChessGameView initialChessGameRoomData={initialData} />);

            await expect.element(getByTestId('clocks-socket-controller')).toBeInTheDocument();
        });

        it('omits chess clock controllers entirely when clockState is null', async () => {
            const currentPlayerId = 'player-1';
            const gameRoom = createMockChessGameRoom({
                type: 'self',
                colorToPlayerId: {
                    white: currentPlayerId,
                    black: 'player-2',
                },
            });
            const initialData = createMockChessGameRoomState({
                clockState: null,
                gameRoom,
                currentPlayerId,
            });

            const { getByTestId } = await render(<ChessGameView initialChessGameRoomData={initialData} />);

            const localController = getByTestId('clocks-local-controller');
            const socketController = getByTestId('clocks-socket-controller');

            await expect.element(localController).not.toBeInTheDocument();
            await expect.element(socketController).not.toBeInTheDocument();
        });

        it('omits chess clock controllers when clockState is null for remote games', async () => {
            const currentPlayerId = 'player-1';
            const gameRoom = createMockChessGameRoom({
                type: 'player-vs-player',
                colorToPlayerId: {
                    white: currentPlayerId,
                    black: 'player-2',
                },
            });
            const initialData = createMockChessGameRoomState({
                clockState: null,
                gameRoom,
                currentPlayerId,
            });

            const { getByTestId } = await render(<ChessGameView initialChessGameRoomData={initialData} />);

            const localController = getByTestId('clocks-local-controller');
            const socketController = getByTestId('clocks-socket-controller');

            await expect.element(localController).not.toBeInTheDocument();
            await expect.element(socketController).not.toBeInTheDocument();
        });
    });
});
