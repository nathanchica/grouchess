import { render } from 'vitest-browser-react';

import { GameRoomContext } from '../../../providers/ChessGameRoomProvider';
import { PlayerChatSocketContext } from '../../../providers/PlayerChatSocketProvider';
import { createMockGameRoomContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockPlayerChatSocketContextValues } from '../../../providers/__mocks__/PlayerChatSocketProvider';
import PlayersInfoSection from '../PlayersInfoSection';

// Mock child components to test props passed to them
vi.mock('../PlayerCard', () => ({
    default: ({ playerId, color, displayName }: { playerId: string; color: string; displayName: string }) => (
        <div data-testid={`player-card-${color}`} data-player-id={playerId} data-display-name={displayName}>
            PlayerCard-{color}-{displayName}
        </div>
    ),
}));

vi.mock('../chat/PlayerChatPanel', () => ({
    default: ({ currentPlayerId }: { currentPlayerId: string }) => (
        <div data-testid="player-chat-panel" data-current-player-id={currentPlayerId}>
            PlayerChatPanel-{currentPlayerId}
        </div>
    ),
}));

const renderPlayersInfoSection = ({ propOverrides = {}, gameRoomOverrides = {} } = {}) => {
    const defaultProps = {
        variant: 'col' as const,
    };

    const gameRoomContextValue = createMockGameRoomContextValues({
        currentPlayerId: 'player-1',
        gameRoom: {
            ...createMockGameRoomContextValues().gameRoom,
            playerIdToDisplayName: {
                'player-1': 'Alice',
                'player-2': 'Bob',
            },
            colorToPlayerId: {
                white: 'player-1',
                black: 'player-2',
            },
            type: 'player-vs-player',
        },
        ...gameRoomOverrides,
    });

    const playerChatSocketContextValue = createMockPlayerChatSocketContextValues();

    return render(
        <GameRoomContext.Provider value={gameRoomContextValue}>
            <PlayerChatSocketContext.Provider value={playerChatSocketContextValue}>
                <PlayersInfoSection {...defaultProps} {...propOverrides} />
            </PlayerChatSocketContext.Provider>
        </GameRoomContext.Provider>
    );
};

describe('PlayersInfoSection', () => {
    describe('component rendering', () => {
        it.each([
            { scenario: 'column layout', variant: 'col' as const },
            { scenario: 'row layout', variant: 'row' as const },
        ])('renders successfully with $scenario', async ({ variant }) => {
            const { getByText } = await renderPlayersInfoSection({ propOverrides: { variant } });

            await expect.element(getByText('PlayerCard-white-Alice')).toBeInTheDocument();
            await expect.element(getByText('PlayerCard-black-Bob')).toBeInTheDocument();
        });

        it.each([
            { scenario: 'white player current player', currentPlayerId: 'player-1' },
            { scenario: 'black player current player', currentPlayerId: 'player-2' },
        ])('renders as $scenario', async ({ currentPlayerId }) => {
            const { getByTestId } = await renderPlayersInfoSection({
                gameRoomOverrides: { currentPlayerId },
            });

            const whiteCard = getByTestId('player-card-white');
            const blackCard = getByTestId('player-card-black');

            expect(whiteCard).toHaveAttribute('data-player-id', 'player-1');
            expect(blackCard).toHaveAttribute('data-player-id', 'player-2');
        });

        it('renders PlayerChatPanel for player-vs-player room', async () => {
            const { getByPlaceholder } = await renderPlayersInfoSection({
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToDisplayName: {
                            'player-1': 'Alice',
                            'player-2': 'Bob',
                        },
                        colorToPlayerId: {
                            white: 'player-1',
                            black: 'player-2',
                        },
                        type: 'player-vs-player',
                    },
                },
            });

            // Test for the chat input field which is part of PlayerChatPanel
            const chatInput = getByPlaceholder('Message');
            await expect.element(chatInput).toBeInTheDocument();
        });

        it('does not render PlayerChatPanel for self room', async () => {
            const { getByPlaceholder } = await renderPlayersInfoSection({
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToDisplayName: {
                            'player-1': 'Alice',
                            'player-2': 'Bob',
                        },
                        colorToPlayerId: {
                            white: 'player-1',
                            black: 'player-2',
                        },
                        type: 'self',
                    },
                },
            });

            // Test for the chat input field which is part of PlayerChatPanel
            const chatInput = getByPlaceholder('Message');
            await expect.element(chatInput).not.toBeInTheDocument();
        });
    });

    describe('player card props', () => {
        it('passes correct props to white PlayerCard', async () => {
            const { getByTestId } = await renderPlayersInfoSection();

            const whiteCard = getByTestId('player-card-white');

            expect(whiteCard).toHaveAttribute('data-player-id', 'player-1');
            expect(whiteCard).toHaveAttribute('data-display-name', 'Alice');
        });

        it('passes correct props to black PlayerCard', async () => {
            const { getByTestId } = await renderPlayersInfoSection();

            const blackCard = getByTestId('player-card-black');

            expect(blackCard).toHaveAttribute('data-player-id', 'player-2');
            expect(blackCard).toHaveAttribute('data-display-name', 'Bob');
        });

        it('renders PlayerChatPanel when room type is player-vs-player', async () => {
            const { getByPlaceholder } = await renderPlayersInfoSection({
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToDisplayName: {
                            'player-1': 'Alice',
                            'player-2': 'Bob',
                        },
                        colorToPlayerId: {
                            white: 'player-1',
                            black: 'player-2',
                        },
                        type: 'player-vs-player',
                    },
                },
            });

            await expect.element(getByPlaceholder('Message')).toBeInTheDocument();
        });

        it('uses correct display names from playerIdToDisplayName', async () => {
            const { getByTestId } = await renderPlayersInfoSection({
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToDisplayName: {
                            'player-1': 'Magnus',
                            'player-2': 'Hikaru',
                        },
                        colorToPlayerId: {
                            white: 'player-1',
                            black: 'player-2',
                        },
                    },
                },
            });

            const whiteCard = getByTestId('player-card-white');
            const blackCard = getByTestId('player-card-black');

            expect(whiteCard).toHaveAttribute('data-display-name', 'Magnus');
            expect(blackCard).toHaveAttribute('data-display-name', 'Hikaru');
        });
    });

    describe('edge cases and error handling', () => {
        it.each([
            {
                scenario: 'whitePlayerId is null',
                colorToPlayerId: { white: null, black: 'player-2' },
            },
            {
                scenario: 'blackPlayerId is null',
                colorToPlayerId: { white: 'player-1', black: null },
            },
            {
                scenario: 'both playerIds are null',
                colorToPlayerId: { white: null, black: null },
            },
        ])('throws invariant error when $scenario', async ({ colorToPlayerId }) => {
            await expect(
                renderPlayersInfoSection({
                    gameRoomOverrides: {
                        gameRoom: {
                            ...createMockGameRoomContextValues().gameRoom,
                            playerIdToDisplayName: {
                                'player-1': 'Alice',
                                'player-2': 'Bob',
                            },
                            colorToPlayerId,
                        },
                    },
                })
            ).rejects.toThrow('Both players must be present to display PlayersInfoSection');
        });

        it('handles different player IDs correctly', async () => {
            const { getByTestId } = await renderPlayersInfoSection({
                gameRoomOverrides: {
                    currentPlayerId: 'custom-player-white',
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToDisplayName: {
                            'custom-player-white': 'WhitePlayer',
                            'custom-player-black': 'BlackPlayer',
                        },
                        colorToPlayerId: {
                            white: 'custom-player-white',
                            black: 'custom-player-black',
                        },
                    },
                },
            });

            const whiteCard = getByTestId('player-card-white');
            const blackCard = getByTestId('player-card-black');

            expect(whiteCard).toHaveAttribute('data-player-id', 'custom-player-white');
            expect(whiteCard).toHaveAttribute('data-display-name', 'WhitePlayer');
            expect(blackCard).toHaveAttribute('data-player-id', 'custom-player-black');
            expect(blackCard).toHaveAttribute('data-display-name', 'BlackPlayer');
        });

        it('handles missing display name gracefully', async () => {
            const { getByText } = await renderPlayersInfoSection({
                gameRoomOverrides: {
                    gameRoom: {
                        ...createMockGameRoomContextValues().gameRoom,
                        playerIdToDisplayName: {
                            'player-1': 'Alice',
                            // player-2 display name is missing - will be undefined
                        },
                        colorToPlayerId: {
                            white: 'player-1',
                            black: 'player-2',
                        },
                    },
                },
            });

            await expect.element(getByText('PlayerCard-white-Alice')).toBeInTheDocument();
            await expect.element(getByText(/PlayerCard-black/)).toBeInTheDocument();
        });
    });
});
