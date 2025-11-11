import type { PieceColor } from '@grouchess/models';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-react';

import {
    ChessGameContext,
    type ChessGameContextType,
    GameRoomContext,
    type GameRoomContextType,
} from '../../../providers/ChessGameRoomProvider';
import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import {
    createMockChessGameContextValues,
    createMockGameRoomContextValues,
} from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import { aliasToPieceImageData } from '../../../utils/pieces';
import GameInfoPanel from '../GameInfoPanel';

vi.mock('../BottomDrawer', () => ({
    default: vi.fn(({ onClosingEnd, onStartClosing, shouldClose, ariaLabel, children }) => (
        <div data-testid="mock-bottom-drawer" aria-label={ariaLabel}>
            <p data-testid="should-close-text">shouldClose: {shouldClose ? 'true' : 'false'}</p>
            <button type="button" onClick={onStartClosing}>
                Trigger onStartClosing
            </button>
            <button type="button" onClick={onClosingEnd}>
                Trigger onClosingEnd
            </button>
            {children}
        </div>
    )),
}));

vi.mock('../GameActions', () => ({
    default: vi.fn(({ playerColor }) => (
        <div data-testid="mock-game-actions">
            <p data-testid="player-color-text">Player Color: {playerColor}</p>
        </div>
    )),
}));

vi.mock('../MoveHistoryTable', () => ({
    default: vi.fn(({ onExitClick }) => (
        <div data-testid="mock-move-history-table">
            <button type="button" onClick={onExitClick}>
                Trigger onExitClick
            </button>
        </div>
    )),
}));

vi.mock('../bottom_drawer_views/ExitGameView', () => ({
    default: vi.fn(({ onDismiss }) => (
        <div data-testid="mock-exit-game-view">
            <button type="button" onClick={onDismiss}>
                Dismiss
            </button>
        </div>
    )),
}));

vi.mock('../bottom_drawer_views/LoadBoardView', () => ({
    default: vi.fn(({ onDismiss }) => (
        <div data-testid="mock-load-board-view">
            <button type="button" onClick={onDismiss}>
                Dismiss
            </button>
        </div>
    )),
}));

vi.mock('../bottom_drawer_views/PlayerSettingsView', () => ({
    default: vi.fn(() => <div data-testid="mock-player-settings-view" />),
}));

vi.mock('../bottom_drawer_views/ShareBoardView', () => ({
    default: vi.fn(() => <div data-testid="mock-share-board-view" />),
}));

type RenderGameInfoPanelOptions = {
    chessGameOverrides?: Partial<ChessGameContextType>;
    gameRoomOverrides?: Partial<GameRoomContextType>;
    imagesOverrides?: Partial<ImageContextType>;
};
const renderGameInfoPanel = ({
    chessGameOverrides = {},
    gameRoomOverrides = {},
    imagesOverrides = {},
}: RenderGameInfoPanelOptions = {}) => {
    const chessGameValue = createMockChessGameContextValues(chessGameOverrides);
    const gameRoomValue = createMockGameRoomContextValues(gameRoomOverrides);
    const imagesValue = createMockImageContextValues(imagesOverrides);

    return render(
        <ImageContext.Provider value={imagesValue}>
            <ChessGameContext.Provider value={chessGameValue}>
                <GameRoomContext.Provider value={gameRoomValue}>
                    <GameInfoPanel />
                </GameRoomContext.Provider>
            </ChessGameContext.Provider>
        </ImageContext.Provider>
    );
};

describe('GameInfoPanel', () => {
    let chessGameContextValues: ChessGameContextType;
    let gameRoomContextValues: GameRoomContextType;
    let imagesContextValues: ImageContextType;

    beforeEach(() => {
        chessGameContextValues = createMockChessGameContextValues();
        gameRoomContextValues = createMockGameRoomContextValues();
        imagesContextValues = createMockImageContextValues();
    });

    describe('Initial Render and Layout', async () => {
        it('renders logo and title correctly when images are loaded', async () => {
            const rookSrc = 'mock-rook-src';
            const { altText, imgSrc } = aliasToPieceImageData['R'];
            imagesContextValues.isReady = true;
            imagesContextValues.imgSrcMap = {
                [imgSrc]: rookSrc,
            };
            const { getByAltText, getByRole } = await renderGameInfoPanel({
                imagesOverrides: imagesContextValues,
            });

            const logoImg = getByAltText(altText);
            const title = getByRole('heading', { name: /grouchess/i });

            await expect.element(logoImg).toBeVisible();
            expect(logoImg).toHaveAttribute('src', rookSrc);

            await expect.element(title).toBeVisible();
        });

        it('does not render logo when images are not loaded', async () => {
            imagesContextValues.isReady = false;
            const { getByAltText } = await renderGameInfoPanel({
                imagesOverrides: imagesContextValues,
            });

            const { altText } = aliasToPieceImageData['R'];
            const logoImg = getByAltText(altText);
            await expect.element(logoImg).not.toBeInTheDocument();
        });

        it('renders other components', async () => {
            const { getByRole, getByTestId } = await renderGameInfoPanel();

            const moveHistoryTable = getByTestId('mock-move-history-table');
            const gameActions = getByTestId('mock-game-actions');
            const settingsButton = getByRole('button', { name: /settings/i });
            const shareButton = getByRole('button', { name: /share/i });
            const exitGameButton = getByRole('button', { name: /exit game/i });

            await expect.element(moveHistoryTable).toBeInTheDocument();
            await expect.element(gameActions).toBeInTheDocument();
            await expect.element(settingsButton).toBeInTheDocument();
            await expect.element(shareButton).toBeInTheDocument();
            await expect.element(exitGameButton).toBeInTheDocument();
        });
    });

    describe('Self-Play Mode vs Regular Game Mode', () => {
        it('shows reset and load board buttons in self-play mode', async () => {
            gameRoomContextValues.gameRoom.type = 'self';

            const { getByRole } = await renderGameInfoPanel({
                gameRoomOverrides: gameRoomContextValues,
            });

            const resetButton = getByRole('button', { name: /reset game/i });
            const loadBoardButton = getByRole('button', { name: /load board/i });

            await expect.element(resetButton).toBeInTheDocument();
            await expect.element(loadBoardButton).toBeInTheDocument();
        });

        it('hides reset and load board buttons in non-self-play mode', async () => {
            gameRoomContextValues.gameRoom.type = 'player-vs-player';

            const { getByRole } = await renderGameInfoPanel({
                gameRoomOverrides: gameRoomContextValues,
            });

            const resetButton = getByRole('button', { name: /reset game/i });
            const loadBoardButton = getByRole('button', { name: /load board/i });

            await expect.element(resetButton).not.toBeInTheDocument();
            await expect.element(loadBoardButton).not.toBeInTheDocument();
        });

        it('shows GameActions component for non-self-play games', async () => {
            gameRoomContextValues.gameRoom.type = 'player-vs-player';

            const { getByTestId } = await renderGameInfoPanel({
                gameRoomOverrides: gameRoomContextValues,
            });

            const gameActions = getByTestId('mock-game-actions');
            await expect.element(gameActions).toBeInTheDocument();
        });

        it('hides GameActions component for self-play games', async () => {
            gameRoomContextValues.gameRoom.type = 'self';

            const { getByTestId } = await renderGameInfoPanel({
                gameRoomOverrides: gameRoomContextValues,
            });

            const gameActions = getByTestId('mock-game-actions');
            await expect.element(gameActions).not.toBeInTheDocument();
        });
    });

    describe('Bottom Drawer Toggle Logic', () => {
        it.each([
            {
                buttonName: 'Settings',
                expectedViewTestId: 'mock-player-settings-view',
            },
            {
                buttonName: 'Load Board',
                expectedViewTestId: 'mock-load-board-view',
            },
            {
                buttonName: 'Exit Game',
                expectedViewTestId: 'mock-exit-game-view',
            },
            {
                buttonName: 'Share',
                expectedViewTestId: 'mock-share-board-view',
            },
        ])(
            'opens $buttonName bottom drawer when clicking unopened view button in self-play mode',
            async ({ buttonName, expectedViewTestId }) => {
                gameRoomContextValues.gameRoom.type = 'self';

                const { getByRole, getByTestId } = await renderGameInfoPanel({
                    gameRoomOverrides: gameRoomContextValues,
                });

                const bottomDrawer = getByTestId('mock-bottom-drawer');
                const viewButton = getByRole('button', { name: buttonName });
                const activeView = getByTestId(expectedViewTestId);

                await expect.element(bottomDrawer).not.toBeInTheDocument();

                await viewButton.click();
                await expect.element(bottomDrawer).toBeInTheDocument();
                await expect.element(activeView).toBeInTheDocument();
            }
        );

        it.each([
            {
                buttonName: 'Settings',
                expectedViewTestId: 'mock-player-settings-view',
            },
            {
                buttonName: 'Exit Game',
                expectedViewTestId: 'mock-exit-game-view',
            },
            {
                buttonName: 'Share',
                expectedViewTestId: 'mock-share-board-view',
            },
        ])(
            'opens $buttonName bottom drawer when clicking unopened view button in non self-play mode',
            async ({ buttonName, expectedViewTestId }) => {
                gameRoomContextValues.gameRoom.type = 'player-vs-player';

                const { getByRole, getByTestId } = await renderGameInfoPanel({
                    gameRoomOverrides: gameRoomContextValues,
                });

                const bottomDrawer = getByTestId('mock-bottom-drawer');
                const viewButton = getByRole('button', { name: buttonName });
                const activeView = getByTestId(expectedViewTestId);

                await expect.element(bottomDrawer).not.toBeInTheDocument();

                await viewButton.click();
                await expect.element(bottomDrawer).toBeInTheDocument();
                await expect.element(activeView).toBeInTheDocument();
            }
        );

        it.each([
            {
                buttonName: 'Settings',
                expectedViewTestId: 'mock-player-settings-view',
            },
            {
                buttonName: 'Load Board',
                expectedViewTestId: 'mock-load-board-view',
            },
            {
                buttonName: 'Exit Game',
                expectedViewTestId: 'mock-exit-game-view',
            },
            {
                buttonName: 'Share',
                expectedViewTestId: 'mock-share-board-view',
            },
        ])(
            'closes drawer when clicking the same active view button for $buttonName view',
            async ({ buttonName, expectedViewTestId }) => {
                gameRoomContextValues.gameRoom.type = 'self';

                const { getByRole, getByTestId } = await renderGameInfoPanel({
                    gameRoomOverrides: gameRoomContextValues,
                });

                const bottomDrawer = getByTestId('mock-bottom-drawer');
                const shouldCloseText = getByTestId('should-close-text');
                const viewButton = getByRole('button', { name: buttonName });
                const activeView = getByTestId(expectedViewTestId);

                await expect.element(bottomDrawer).not.toBeInTheDocument();

                await userEvent.click(viewButton);
                await expect.element(bottomDrawer).toBeInTheDocument();
                await expect.element(activeView).toBeInTheDocument();
                expect(shouldCloseText).toHaveTextContent('shouldClose: false');

                await userEvent.click(viewButton);
                expect(shouldCloseText).toHaveTextContent('shouldClose: true');
            }
        );

        it('switches views when clicking different view button', async () => {
            const { getByRole, getByTestId } = await renderGameInfoPanel({
                gameRoomOverrides: gameRoomContextValues,
            });

            const bottomDrawer = getByTestId('mock-bottom-drawer');
            const settingsViewButton = getByRole('button', { name: 'Settings' });
            const shareViewButton = getByRole('button', { name: 'Share' });
            const settingsView = getByTestId('mock-player-settings-view');
            const shareView = getByTestId('mock-share-board-view');
            const shouldCloseText = getByTestId('should-close-text');

            await expect.element(bottomDrawer).not.toBeInTheDocument();

            await userEvent.click(settingsViewButton);
            await expect.element(bottomDrawer).toBeInTheDocument();
            await expect.element(settingsView).toBeInTheDocument();
            expect(shouldCloseText).toHaveTextContent('shouldClose: false');
            expect(bottomDrawer).toHaveAttribute('aria-label', 'Player Settings');

            await userEvent.click(shareViewButton);
            await expect.element(shareView).toBeInTheDocument();
            await expect.element(settingsView).not.toBeInTheDocument();
            expect(shouldCloseText).toHaveTextContent('shouldClose: false');
            expect(bottomDrawer).toHaveAttribute('aria-label', 'Share Board');
        });
    });

    describe('Bottom Drawer Content onDismiss prop', () => {
        it.each([
            {
                buttonName: 'Load Board',
                boardGameView: 'renders LoadBoardView with onDismiss prop',
                expectedViewTestId: 'mock-load-board-view',
            },
            {
                buttonName: 'Exit Game',
                boardGameView: 'renders ExitGameView with onDismiss prop',
                expectedViewTestId: 'mock-exit-game-view',
            },
        ])('renders $boardGameView with onDismiss prop', async ({ buttonName, expectedViewTestId }) => {
            gameRoomContextValues.gameRoom.type = 'self';
            const { getByRole, getByTestId } = await renderGameInfoPanel({
                gameRoomOverrides: gameRoomContextValues,
            });

            const toggleButton = getByRole('button', { name: buttonName });
            const bottomDrawerView = getByTestId(expectedViewTestId);
            const dismissButton = getByRole('button', { name: /dismiss/i });
            const shouldCloseText = getByTestId('should-close-text');
            const bottomDrawer = getByTestId('mock-bottom-drawer');

            await expect.element(bottomDrawer).not.toBeInTheDocument();

            await userEvent.click(toggleButton);
            await expect.element(bottomDrawer).toBeInTheDocument();
            await expect.element(bottomDrawerView).toBeInTheDocument();
            expect(shouldCloseText).toHaveTextContent('shouldClose: false');

            await userEvent.click(dismissButton);
            expect(shouldCloseText).toHaveTextContent('shouldClose: true');
        });
    });

    describe('Reset Button Functionality', () => {
        it('reset button calls loadFEN with no arguments in self-play mode', async () => {
            const mockLoadFEN = vi.fn();
            gameRoomContextValues.gameRoom.type = 'self';
            chessGameContextValues.loadFEN = mockLoadFEN;

            const { getByRole } = await renderGameInfoPanel({
                chessGameOverrides: chessGameContextValues,
                gameRoomOverrides: gameRoomContextValues,
            });

            const resetButton = getByRole('button', { name: /reset game/i });
            await userEvent.click(resetButton);

            expect(mockLoadFEN).toHaveBeenCalledWith();
        });
    });

    describe('Bottom Drawer Lifecycle', () => {
        it('dismisses drawer completely after closing animation', async () => {
            const { getByRole, getByTestId } = await renderGameInfoPanel();

            const settingsButton = getByRole('button', { name: /settings/i });
            const bottomDrawer = getByTestId('mock-bottom-drawer');
            const shouldCloseText = getByTestId('should-close-text');
            const onStartClosingButton = getByRole('button', { name: /trigger onstartclosing/i });
            const onClosingEndButton = getByRole('button', { name: /trigger onclosingend/i });

            await settingsButton.click();
            await expect.element(bottomDrawer).toBeInTheDocument();

            expect(shouldCloseText).toHaveTextContent('shouldClose: false');
            await onStartClosingButton.click();
            expect(shouldCloseText).toHaveTextContent('shouldClose: true');

            await onClosingEndButton.click();
            await expect.element(bottomDrawer).not.toBeInTheDocument();
        });
    });

    describe('MoveHistoryTable Integration', () => {
        it('passes onExitClick to MoveHistoryTable that toggles exit-game view', async () => {
            const { getByTestId } = await renderGameInfoPanel();

            const moveHistoryTable = getByTestId('mock-move-history-table');
            const exitGameButton = moveHistoryTable.getByRole('button', { name: /trigger onexitclick/i });
            const bottomDrawer = getByTestId('mock-bottom-drawer');
            const exitGameView = getByTestId('mock-exit-game-view');

            await expect.element(bottomDrawer).not.toBeInTheDocument();

            await exitGameButton.click();
            await expect.element(bottomDrawer).toBeInTheDocument();
            await expect.element(exitGameView).toBeInTheDocument();
        });
    });

    describe('GameActions Integration', () => {
        it.each([
            {
                playerColor: 'white',
            },
            {
                playerColor: 'black',
            },
        ])('GameActions receives correct player color: $playerColor', async ({ playerColor }) => {
            gameRoomContextValues.gameRoom.type = 'player-vs-player';
            gameRoomContextValues.currentPlayerColor = playerColor as PieceColor;

            const { getByTestId } = await renderGameInfoPanel({
                gameRoomOverrides: gameRoomContextValues,
            });
            const playerColorText = getByTestId('player-color-text');
            expect(playerColorText).toHaveTextContent(`Player Color: ${playerColor}`);
        });
    });

    describe('Edge Cases and Error Handling', () => {
        it('handles missing image gracefully', async () => {
            imagesContextValues.isReady = true;
            imagesContextValues.imgSrcMap = {
                // Intentionally leave out rook image
            };
            const { getByAltText } = await renderGameInfoPanel({
                imagesOverrides: imagesContextValues,
            });

            const { altText, imgSrc } = aliasToPieceImageData['R'];
            const logoImg = getByAltText(altText);

            await expect.element(logoImg).toBeVisible();
            expect(logoImg).toHaveAttribute('src', imgSrc);
        });
    });
});
