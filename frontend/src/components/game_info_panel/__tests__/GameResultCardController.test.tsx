import { createMockChessGameState } from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { ChessGameContext } from '../../../providers/ChessGameRoomProvider';
import { PlayerChatSocketContext } from '../../../providers/PlayerChatSocketProvider';
import { createMockChessGameContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockPlayerChatSocketContextValues } from '../../../providers/__mocks__/PlayerChatSocketProvider';
import GameResultCardController from '../GameResultCardController';

// Mock GameResultCard to spy on props
vi.mock('../GameResultCard', () => ({
    default: vi.fn(({ isAwaitingRematchResponse, onRematchClick, onExitClick, gameState }) => (
        <div data-testid="game-result-card">
            <p>isAwaitingRematchResponse: {isAwaitingRematchResponse.toString()}</p>
            <button onClick={onRematchClick}>Rematch</button>
            <button onClick={onExitClick}>Exit</button>
            <p>gameState: {JSON.stringify(gameState)}</p>
        </div>
    )),
}));

const defaultProps = {
    isSelfPlay: false,
    gameState: createMockChessGameState({ status: 'checkmate', winner: 'white' }),
    onExitClick: vi.fn(),
};

const renderGameResultCardController = ({
    propOverrides = {},
    playerChatSocketOverrides = {},
    chessGameOverrides = {},
} = {}) => {
    const playerChatSocketValue = createMockPlayerChatSocketContextValues(playerChatSocketOverrides);
    const chessGameValue = createMockChessGameContextValues(chessGameOverrides);

    return render(
        <PlayerChatSocketContext.Provider value={playerChatSocketValue}>
            <ChessGameContext.Provider value={chessGameValue}>
                <GameResultCardController {...defaultProps} {...propOverrides} />
            </ChessGameContext.Provider>
        </PlayerChatSocketContext.Provider>
    );
};

describe('GameResultCardController', () => {
    describe('Component Rendering and Props Passing', () => {
        it.each([
            {
                isAwaitingRematchResponse: true,
            },
            {
                isAwaitingRematchResponse: false,
            },
        ])('renders GameResultCard with isAwaitingRematchResponse=%s', async ({ isAwaitingRematchResponse }) => {
            const mockOnExitClick = vi.fn();
            const mockGameState = createMockChessGameState({ status: 'checkmate', winner: 'black' });

            const { getByTestId, getByText } = await renderGameResultCardController({
                propOverrides: {
                    onExitClick: mockOnExitClick,
                    gameState: mockGameState,
                },
                playerChatSocketOverrides: {
                    isAwaitingRematchResponse,
                },
            });

            const gameResultCard = getByTestId('game-result-card');
            await expect.element(gameResultCard).toBeInTheDocument();
            await expect
                .element(getByText(`isAwaitingRematchResponse: ${isAwaitingRematchResponse}`))
                .toBeInTheDocument();
            await expect.element(getByText(`gameState: ${JSON.stringify(mockGameState)}`)).toBeInTheDocument();
        });
    });

    describe('Rematch Handling - Self Play Mode', () => {
        it('calls loadFEN when rematch clicked in self-play mode', async () => {
            const mockLoadFEN = vi.fn();

            const { getByRole } = await renderGameResultCardController({
                propOverrides: {
                    isSelfPlay: true,
                },
                chessGameOverrides: {
                    loadFEN: mockLoadFEN,
                },
            });

            const rematchButton = getByRole('button', { name: 'Rematch' });
            await expect.element(rematchButton).toBeInTheDocument();
            await rematchButton.click();

            expect(mockLoadFEN).toHaveBeenCalledTimes(1);
        });

        it('does not call sendRematchOffer in self-play mode', async () => {
            const mockSendRematchOffer = vi.fn();

            const { getByRole } = await renderGameResultCardController({
                propOverrides: {
                    isSelfPlay: true,
                },
                playerChatSocketOverrides: {
                    sendRematchOffer: mockSendRematchOffer,
                },
            });

            const rematchButton = getByRole('button', { name: 'Rematch' });
            await expect.element(rematchButton).toBeInTheDocument();
            await rematchButton.click();

            expect(mockSendRematchOffer).not.toHaveBeenCalled();
        });
    });

    describe('Rematch Handling - Multiplayer Mode', () => {
        it('calls sendRematchOffer when rematch clicked in multiplayer mode', async () => {
            const mockSendRematchOffer = vi.fn();

            const { getByRole } = await renderGameResultCardController({
                propOverrides: {
                    isSelfPlay: false,
                },
                playerChatSocketOverrides: {
                    sendRematchOffer: mockSendRematchOffer,
                },
            });

            const rematchButton = getByRole('button', { name: 'Rematch' });
            await expect.element(rematchButton).toBeInTheDocument();
            await rematchButton.click();

            expect(mockSendRematchOffer).toHaveBeenCalledTimes(1);
        });

        it('does not call loadFEN in multiplayer mode', async () => {
            const mockLoadFEN = vi.fn();

            const { getByRole } = await renderGameResultCardController({
                propOverrides: {
                    isSelfPlay: false,
                },
                chessGameOverrides: {
                    loadFEN: mockLoadFEN,
                },
            });

            const rematchButton = getByRole('button', { name: 'Rematch' });
            await expect.element(rematchButton).toBeInTheDocument();
            await rematchButton.click();

            expect(mockLoadFEN).not.toHaveBeenCalled();
        });
    });

    describe('Exit Handling', () => {
        it('passes onExitClick callback through to GameResultCard', async () => {
            const mockOnExitClick = vi.fn();

            const { getByRole } = await renderGameResultCardController({
                propOverrides: {
                    onExitClick: mockOnExitClick,
                },
            });

            const exitButton = getByRole('button', { name: 'Exit' });
            await expect.element(exitButton).toBeInTheDocument();
            await exitButton.click();

            expect(mockOnExitClick).toHaveBeenCalledTimes(1);
        });
    });
});
