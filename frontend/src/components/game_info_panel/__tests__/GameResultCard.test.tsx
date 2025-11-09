import type { ChessGameState } from '@grouchess/models';
import { page } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import GameResultCard from '../GameResultCard';

describe('GameResultCard', () => {
    const createDefaultProps = (overrides = {}) => ({
        gameState: {
            status: 'checkmate',
            winner: 'white',
        } as ChessGameState,
        isAwaitingRematchResponse: false,
        onExitClick: vi.fn(),
        onRematchClick: vi.fn(),
        ...overrides,
    });

    describe('Initial Display', () => {
        it('renders basic elements with aria attributes', async () => {
            const { getByRole, getByText } = await render(<GameResultCard {...createDefaultProps()} />);

            const statusContainer = getByRole('status');
            await expect.element(statusContainer).toBeInTheDocument();
            await expect.element(statusContainer).toHaveAttribute('aria-live', 'polite');

            await expect.element(getByText('Checkmate')).toBeInTheDocument();
            await expect.element(getByText('White wins')).toBeInTheDocument();
            await expect.element(getByText('1-0')).toBeInTheDocument();
        });
    });

    describe('Game Outcome Display', () => {
        it.each([
            {
                scenario: 'white wins by checkmate',
                status: 'checkmate',
                winner: 'white',
                expectedStatus: 'Checkmate',
                expectedWinner: 'White wins',
                expectedScore: '1-0',
            },
            {
                scenario: 'black wins by checkmate',
                status: 'checkmate',
                winner: 'black',
                expectedStatus: 'Checkmate',
                expectedWinner: 'Black wins',
                expectedScore: '0-1',
            },
            {
                scenario: 'white wins by timeout',
                status: 'time-out',
                winner: 'white',
                expectedStatus: 'Time out',
                expectedWinner: 'White wins',
                expectedScore: '1-0',
            },
            {
                scenario: 'black wins by timeout',
                status: 'time-out',
                winner: 'black',
                expectedStatus: 'Time out',
                expectedWinner: 'Black wins',
                expectedScore: '0-1',
            },
        ])(
            'displays $expectedWinner when $scenario',
            async ({ status, winner, expectedStatus, expectedWinner, expectedScore }) => {
                const { getByText } = await render(
                    <GameResultCard
                        {...createDefaultProps({
                            gameState: { status, winner } as ChessGameState,
                        })}
                    />
                );

                await expect.element(getByText(expectedStatus)).toBeInTheDocument();
                await expect.element(getByText(expectedWinner)).toBeInTheDocument();
                await expect.element(getByText(expectedScore)).toBeInTheDocument();
            }
        );

        it.each([
            {
                scenario: 'white wins by resignation',
                winner: 'white',
                expectedResignationLabel: 'Black resigned',
                expectedWinner: 'White wins',
                expectedScore: '1-0',
            },
            {
                scenario: 'black wins by resignation',
                winner: 'black',
                expectedResignationLabel: 'White resigned',
                expectedWinner: 'Black wins',
                expectedScore: '0-1',
            },
        ])(
            'displays resignation correctly when $scenario',
            async ({ winner, expectedResignationLabel, expectedWinner, expectedScore }) => {
                const { getByText } = await render(
                    <GameResultCard
                        {...createDefaultProps({
                            gameState: { status: 'resigned', winner } as ChessGameState,
                        })}
                    />
                );

                await expect.element(getByText(expectedResignationLabel)).toBeInTheDocument();
                await expect.element(getByText(expectedWinner)).toBeInTheDocument();
                await expect.element(getByText(expectedScore)).toBeInTheDocument();
            }
        );
    });

    describe('Draw Scenarios', () => {
        it.each([
            {
                scenario: 'stalemate',
                status: 'stalemate',
                expectedStatus: 'Stalemate',
            },
            {
                scenario: '50-move rule',
                status: '50-move-draw',
                expectedStatus: '50-Move Draw',
            },
            {
                scenario: 'threefold repetition',
                status: 'threefold-repetition',
                expectedStatus: 'Threefold Repetition',
            },
            {
                scenario: 'agreement',
                status: 'draw-by-agreement',
                expectedStatus: 'Draw by Agreement',
            },
            {
                scenario: 'insufficient material',
                status: 'insufficient-material',
                expectedStatus: 'Insufficient Material',
            },
        ])('displays draw correctly for $scenario', async ({ status, expectedStatus }) => {
            const { getByText } = await render(
                <GameResultCard
                    {...createDefaultProps({
                        gameState: { status } as ChessGameState,
                    })}
                />
            );

            await expect.element(getByText(expectedStatus)).toBeInTheDocument();
            await expect.element(getByText('Draw', { exact: true })).toBeInTheDocument();
            await expect.element(getByText('1/2-1/2')).toBeInTheDocument();
        });
    });

    describe('User Interactions', () => {
        it('clicking rematch button triggers callback', async () => {
            const onRematchClick = vi.fn();
            await render(<GameResultCard {...createDefaultProps({ onRematchClick })} />);

            await page.getByRole('button', { name: /offer rematch/i }).click();

            expect(onRematchClick).toHaveBeenCalledTimes(1);
        });

        it('clicking exit button triggers callback', async () => {
            const onExitClick = vi.fn();
            await render(<GameResultCard {...createDefaultProps({ onExitClick })} />);

            await page.getByRole('button', { name: /exit game/i }).click();

            expect(onExitClick).toHaveBeenCalledTimes(1);
        });
    });

    describe('Loading States', () => {
        it('shows spinner when awaiting rematch response', async () => {
            const { getByLabelText, getByRole } = await render(
                <GameResultCard {...createDefaultProps({ isAwaitingRematchResponse: true })} />
            );

            await expect.element(getByLabelText('Awaiting rematch response')).toBeInTheDocument();

            const rematchButton = getByRole('button', { name: /offer rematch/i });
            await expect.element(rematchButton).not.toBeInTheDocument();

            const exitButton = getByRole('button', { name: /exit game/i });
            await expect.element(exitButton).toBeInTheDocument();
        });

        it('shows rematch button when not awaiting response', async () => {
            const { getByLabelText } = await render(
                <GameResultCard {...createDefaultProps({ isAwaitingRematchResponse: false })} />
            );

            await expect.element(getByLabelText('Offer rematch')).toBeInTheDocument();
            await expect.element(getByLabelText('Awaiting rematch response')).not.toBeInTheDocument();
        });
    });

    describe('Edge Cases', () => {
        it('handles resigned status with undefined winner', async () => {
            await expect(
                render(
                    <GameResultCard
                        {...createDefaultProps({
                            gameState: { status: 'resigned', winner: undefined } as ChessGameState,
                        })}
                    />
                )
            ).rejects.toThrow('Winner must be defined for non-draw game results');
        });

        it('throws error for in-progress status', async () => {
            await expect(
                render(
                    <GameResultCard
                        {...createDefaultProps({
                            gameState: { status: 'in-progress', winner: undefined } as ChessGameState,
                        })}
                    />
                )
            ).rejects.toThrow('GameResultCard should only be used for completed games');
        });
    });
});
