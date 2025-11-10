import type { ChessGame } from '@grouchess/models';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import { ChessGameContext, type ChessGameContextType } from '../../../providers/ChessGameRoomProvider';
import { SocketContext } from '../../../providers/SocketProvider';
import { createMockChessGameContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockSocketContextValues } from '../../../providers/__mocks__/SocketProvider';
import GameActions from '../GameActions';

describe('GameActions', () => {
    const renderGameActions = ({
        propOverrides = {},
        socketContextOverrides = {},
        chessGameContextOverrides = {},
    }: {
        propOverrides?: Partial<{ playerColor: 'white' | 'black' }>;
        socketContextOverrides?: Parameters<typeof createMockSocketContextValues>[0];
        chessGameContextOverrides?: Parameters<typeof createMockChessGameContextValues>[0];
    } = {}) => {
        const defaultProps = {
            playerColor: 'white' as const,
            ...propOverrides,
        };

        const socketContextValue = createMockSocketContextValues(socketContextOverrides);
        const chessGameContextValue = createMockChessGameContextValues(chessGameContextOverrides);

        return render(
            <SocketContext.Provider value={socketContextValue}>
                <ChessGameContext.Provider value={chessGameContextValue}>
                    <GameActions {...defaultProps} />
                </ChessGameContext.Provider>
            </SocketContext.Provider>
        );
    };

    describe('Component Rendering', () => {
        it('renders both action buttons with proper accessibility attributes', async () => {
            const { getByRole } = await renderGameActions();

            const drawButton = getByRole('button', { name: /offer a draw/i });
            const resignButton = getByRole('button', { name: /resign game/i });

            await expect.element(drawButton).toBeVisible();
            await expect.element(resignButton).toBeVisible();
        });
    });

    describe('Draw Offer Button States', () => {
        let chessGameOverrides: ChessGameContextType;

        beforeEach(() => {
            chessGameOverrides = createMockChessGameContextValues();
        });

        it('is disabled after draw has been offered', async () => {
            chessGameOverrides.chessGame.boardState.playerTurn = 'white';
            chessGameOverrides.chessGame.gameState.status = 'in-progress';

            const { getByRole } = await renderGameActions({
                propOverrides: { playerColor: 'white' },
                chessGameContextOverrides: chessGameOverrides,
            });

            const drawButton = getByRole('button', { name: /offer a draw/i });
            await expect.element(drawButton).toBeEnabled();

            await drawButton.click();
            await expect.element(drawButton).toBeDisabled();
        });

        it.each([
            { status: 'checkmate', description: 'game ended by checkmate' },
            { status: 'stalemate', description: 'game ended by stalemate' },
            { status: 'resigned', description: 'game already resigned' },
            { status: 'draw-by-agreement', description: 'draw already agreed' },
            { status: '50-move-draw', description: 'automatic draw by 50-move rule' },
            { status: 'threefold-repetition', description: 'automatic draw by repetition' },
            { status: 'insufficient-material', description: 'automatic draw by insufficient material' },
            { status: 'time-out', description: 'game ended by timeout' },
        ] as Array<{ status: ChessGame['gameState']['status']; description: string }>)(
            'is disabled when $description',
            async ({ status }) => {
                chessGameOverrides.chessGame.gameState.status = status;

                const { getByRole } = await renderGameActions({
                    propOverrides: { playerColor: 'white' },
                    chessGameContextOverrides: chessGameOverrides,
                });

                const drawButton = getByRole('button', { name: /offer a draw/i });
                await expect.element(drawButton).toBeDisabled();
            }
        );

        it.each([
            {
                playerColor: 'white',
                playerTurn: 'white',
                scenario: "white player's turn",
            },
            {
                playerColor: 'black',
                playerTurn: 'black',
                scenario: "black player's turn",
            },
        ] as Array<{
            playerColor: 'white' | 'black';
            playerTurn: 'white' | 'black';
            scenario: string;
        }>)('is enabled when $scenario', async ({ playerColor, playerTurn }) => {
            chessGameOverrides.chessGame.boardState.playerTurn = playerTurn;
            chessGameOverrides.chessGame.gameState.status = 'in-progress';

            const { getByRole } = await renderGameActions({
                propOverrides: { playerColor },
                chessGameContextOverrides: chessGameOverrides,
            });

            const drawButton = getByRole('button', { name: /offer a draw/i });
            await expect.element(drawButton).toBeEnabled();
        });

        it.each([
            {
                playerColor: 'white',
                playerTurn: 'black',
                scenario: "opponent's turn (white player)",
            },
            {
                playerColor: 'black',
                playerTurn: 'white',
                scenario: "opponent's turn (black player)",
            },
        ] as Array<{
            playerColor: 'white' | 'black';
            playerTurn: 'white' | 'black';
            scenario: string;
        }>)('is disabled when $scenario', async ({ playerColor, playerTurn }) => {
            chessGameOverrides.chessGame.boardState.playerTurn = playerTurn;
            chessGameOverrides.chessGame.gameState.status = 'in-progress';

            const { getByRole } = await renderGameActions({
                propOverrides: { playerColor },
                chessGameContextOverrides: chessGameOverrides,
            });

            const drawButton = getByRole('button', { name: /offer a draw/i });
            await expect.element(drawButton).toBeDisabled();
        });
    });

    describe('Resign Button States', () => {
        let chessGameOverrides: ChessGameContextType;

        beforeEach(() => {
            chessGameOverrides = createMockChessGameContextValues();
        });

        it('is enabled when game is in progress', async () => {
            chessGameOverrides.chessGame.gameState.status = 'in-progress';

            const { getByRole } = await renderGameActions({
                chessGameContextOverrides: chessGameOverrides,
            });

            const resignButton = getByRole('button', { name: /resign game/i });
            await expect.element(resignButton).toBeEnabled();
        });

        it.each([
            { status: 'checkmate', description: 'game ended by checkmate' },
            { status: 'stalemate', description: 'game ended by stalemate' },
            { status: 'resigned', description: 'game already resigned' },
            { status: 'draw-by-agreement', description: 'draw already agreed' },
            { status: '50-move-draw', description: 'automatic draw by 50-move rule' },
            { status: 'threefold-repetition', description: 'automatic draw by repetition' },
            { status: 'insufficient-material', description: 'automatic draw by insufficient material' },
            { status: 'time-out', description: 'game ended by timeout' },
        ] as Array<{ status: ChessGame['gameState']['status']; description: string }>)(
            'is disabled when $description',
            async ({ status }) => {
                chessGameOverrides.chessGame.gameState.status = status;
                const { getByRole } = await renderGameActions({
                    chessGameContextOverrides: chessGameOverrides,
                });

                const resignButton = getByRole('button', { name: /resign game/i });
                await expect.element(resignButton).toBeDisabled();
            }
        );
    });

    describe('User Interactions - Draw Offer', () => {
        it('emits offer_draw socket event when draw button is clicked', async () => {
            const mockSocketEmit = vi.fn();
            const socketContextOverrides = createMockSocketContextValues();
            socketContextOverrides.socket.emit = mockSocketEmit;

            const chessGameContextOverrides = createMockChessGameContextValues();
            chessGameContextOverrides.chessGame.boardState.playerTurn = 'white';
            chessGameContextOverrides.chessGame.gameState.status = 'in-progress';

            const { getByRole } = await renderGameActions({
                propOverrides: { playerColor: 'white' },
                socketContextOverrides,
                chessGameContextOverrides,
            });

            const drawButton = getByRole('button', { name: /offer a draw/i });
            await drawButton.click();

            expect(mockSocketEmit).toHaveBeenCalledWith('offer_draw');
            await expect.element(drawButton).toBeDisabled();
        });
    });

    describe('User Interactions - Resign', () => {
        it('emits resign socket event when resign button is clicked', async () => {
            const mockSocketEmit = vi.fn();
            const socketContextOverrides = createMockSocketContextValues();
            socketContextOverrides.socket.emit = mockSocketEmit;

            const chessGameContextOverrides = createMockChessGameContextValues();
            chessGameContextOverrides.chessGame.gameState.status = 'in-progress';

            const { getByRole } = await renderGameActions({
                propOverrides: { playerColor: 'white' },
                socketContextOverrides,
                chessGameContextOverrides,
            });

            const resignButton = getByRole('button', { name: /resign game/i });
            await resignButton.click();

            expect(mockSocketEmit).toHaveBeenCalledWith('resign');
        });
    });

    describe('Accessibility', () => {
        it('allows keyboard navigation to both buttons', async () => {
            const { getByRole } = await renderGameActions();

            const drawButton = getByRole('button', { name: /offer a draw/i });
            const resignButton = getByRole('button', { name: /resign game/i });

            await userEvent.tab();
            await expect.element(drawButton).toHaveFocus();

            await userEvent.tab();
            await expect.element(resignButton).toHaveFocus();
        });

        it('provides tooltip context for both buttons', async () => {
            const { getByRole } = await renderGameActions();
            const drawTooltip = getByRole('tooltip', { name: /offer a draw/i });
            const resignTooltip = getByRole('tooltip', { name: /resign game/i });

            await expect.element(drawTooltip).toBeInTheDocument();
            await expect.element(resignTooltip).toBeInTheDocument();
        });
    });

    describe('Edge Cases and Combined States', () => {
        it('disables both buttons when game status transitions from in-progress to ended', async () => {
            const chessGameOverrides = createMockChessGameContextValues();
            chessGameOverrides.chessGame.gameState.status = 'in-progress';

            const { getByRole, rerender } = await renderGameActions({
                chessGameContextOverrides: chessGameOverrides,
            });

            const drawButton = getByRole('button', { name: /offer a draw/i });
            const resignButton = getByRole('button', { name: /resign game/i });

            await expect.element(drawButton).toBeEnabled();
            await expect.element(resignButton).toBeEnabled();

            // Simulate game ending
            chessGameOverrides.chessGame.gameState.status = 'checkmate';
            await rerender(
                <SocketContext.Provider value={createMockSocketContextValues()}>
                    <ChessGameContext.Provider value={chessGameOverrides}>
                        <GameActions playerColor="white" />
                    </ChessGameContext.Provider>
                </SocketContext.Provider>
            );

            await expect.element(drawButton).toBeDisabled();
            await expect.element(resignButton).toBeDisabled();
        });
    });
});
