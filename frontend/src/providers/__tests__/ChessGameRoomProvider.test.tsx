import { getPiece, INITIAL_CHESS_BOARD_FEN } from '@grouchess/chess';
import * as chessClocksModule from '@grouchess/chess-clocks';
import type { Move, PieceColor } from '@grouchess/models';
import {
    createMockChessGameRoom,
    createMockChessGame,
    createMockChessClockState,
    createMockTimeControl,
    createMockStartingChessGame,
    createMockMove,
    createMockLegalMovesStoreWithMove,
} from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import ChessGameRoomProvider, {
    useChessClock,
    useChessGame,
    useGameRoom,
    type ChessGameRoomState,
    createSelfPlayChessGameRoomState,
} from '../ChessGameRoomProvider';

vi.mock('@grouchess/chess-clocks', { spy: true });

function ChessClockConsumer() {
    const { clockState, setClocks, resetClocks } = useChessClock();

    const onSetClocksClick = () => {
        const newClockState = createMockChessClockState();
        newClockState.baseTimeMs = 555555;
        setClocks(newClockState);
    };
    const onStartClocksClick = () => {
        const newClockState = createMockChessClockState();
        newClockState.isPaused = false;
        setClocks(newClockState);
    };

    return (
        <>
            <div data-testid="clockState-baseTimeMs">{clockState ? clockState.baseTimeMs : 'no-clock'}</div>
            <div data-testid="clockState-isPaused">{clockState ? clockState.isPaused.toString() : 'no-clock'}</div>

            <button data-testid="setClocks-button" onClick={onSetClocksClick}>
                Set Clocks
            </button>
            <button data-testid="startClocks-button" onClick={onStartClocksClick}>
                Start Clocks
            </button>
            <button data-testid="resetClocks-button" onClick={() => resetClocks()}>
                Reset Clocks
            </button>
        </>
    );
}

function ChessGameConsumer() {
    const { chessGame, movePiece, promotePawn, cancelPromotion, loadFEN, endGame } = useChessGame();
    const legalMove = chessGame.legalMovesStore.allMoves[0];
    const a7Square = chessGame.boardState.board[7];
    const a8Square = chessGame.boardState.board[0];
    const e2Square = chessGame.boardState.board[52];
    const e4Square = chessGame.boardState.board[36];

    const buttons = [
        {
            testId: 'movePiece-button',
            onClick: () => movePiece(legalMove),
            text: 'Move Piece',
        },
        {
            testId: 'promotePawn-button',
            onClick: () => promotePawn('Q'),
            text: 'Promote Pawn',
        },
        {
            testId: 'cancelPromotion-button',
            onClick: () => cancelPromotion(),
            text: 'Cancel Promotion',
        },
        {
            testId: 'loadFEN-without-args-button',
            onClick: () => loadFEN(),
            text: 'Load FEN (no args)',
        },
        {
            testId: 'loadFEN-with-args-button',
            onClick: () => loadFEN(INITIAL_CHESS_BOARD_FEN),
            text: 'Load FEN (with args)',
        },
        {
            testId: 'endGame-button',
            onClick: () => endGame({ reason: 'resigned', winner: 'white' }),
            text: 'End Game',
        },
    ];

    return (
        <>
            <div data-testid="chessGame-timelineVersion">{chessGame.timelineVersion}</div>
            <div data-testid="chessGame-status">{chessGame.gameState.status}</div>
            <div data-testid="chessGame-a7-square">{a7Square ?? 'empty'}</div>
            <div data-testid="chessGame-a8-square">{a8Square ?? 'empty'}</div>
            <div data-testid="chessGame-e2-square">{e2Square ?? 'empty'}</div>
            <div data-testid="chessGame-e4-square">{e4Square ?? 'empty'}</div>

            {buttons.map(({ testId, onClick, text }) => (
                <button key={testId} data-testid={testId} onClick={onClick}>
                    {text}
                </button>
            ))}
        </>
    );
}

function GameRoomConsumer() {
    const { gameRoom, currentPlayerId, currentPlayerColor } = useGameRoom();
    return (
        <div>
            <div data-testid="gameRoom-type">{gameRoom.type}</div>
            <div data-testid="currentPlayerId">{currentPlayerId}</div>
            <div data-testid="currentPlayerColor">{currentPlayerColor}</div>
        </div>
    );
}

function TestComponent() {
    return (
        <div>
            <ChessClockConsumer />
            <ChessGameConsumer />
            <GameRoomConsumer />
        </div>
    );
}

type CreateInitialDataOptions = {
    boardState?: 'empty' | 'starting' | 'only-kings';
};

function createInitialData({ boardState = 'starting' }: CreateInitialDataOptions = {}): ChessGameRoomState {
    const currentPlayerId = 'player-1';

    let baseChessGame;
    switch (boardState) {
        case 'empty':
            baseChessGame = createMockChessGame();
            break;
        case 'only-kings':
            baseChessGame = createMockChessGame();
            baseChessGame.boardState.board[4] = 'k'; // e8
            baseChessGame.boardState.board[60] = 'K'; // e1
            break;
        case 'starting':
        default:
            baseChessGame = createMockStartingChessGame();
            break;
    }

    const chessGameUI = {
        ...baseChessGame,
        previousMoveIndices: [],
        timelineVersion: 0,
        pendingPromotion: null,
    };
    const clockState = createMockChessClockState();
    const gameRoom = createMockChessGameRoom();
    gameRoom.colorToPlayerId = {
        white: currentPlayerId,
        black: 'player-2',
    };

    return {
        chessGame: chessGameUI,
        gameRoom,
        clockState,
        messages: [],
        currentPlayerId,
    } satisfies ChessGameRoomState;
}

let initialData: ChessGameRoomState;

beforeEach(() => {
    initialData = createInitialData();
});

describe('ChessGameRoomProvider', () => {
    it('renders children and provides all three contexts', async () => {
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <TestComponent />
            </ChessGameRoomProvider>
        );

        const baseTimeMs = getByTestId('clockState-baseTimeMs');
        const timelineVersion = getByTestId('chessGame-timelineVersion');
        const gameRoomType = getByTestId('gameRoom-type');
        const currentPlayerId = getByTestId('currentPlayerId');

        await expect.element(baseTimeMs).toHaveTextContent(initialData.clockState!.baseTimeMs!.toString());
        await expect.element(timelineVersion).toHaveTextContent(initialData.chessGame.timelineVersion.toString());
        await expect.element(gameRoomType).toHaveTextContent(initialData.gameRoom.type);
        await expect.element(currentPlayerId).toHaveTextContent(initialData.currentPlayerId);
    });

    it.each([
        { currentPlayerId: 'player-1', expectedColor: 'white' },
        { currentPlayerId: 'player-2', expectedColor: 'black' },
    ])(
        'computes currentPlayerColor as $expectedColor when current player matches $currentPlayerId',
        async ({ currentPlayerId, expectedColor }) => {
            initialData.gameRoom.colorToPlayerId[expectedColor as PieceColor] = currentPlayerId;
            initialData.currentPlayerId = currentPlayerId;

            const { getByTestId } = await render(
                <ChessGameRoomProvider initialData={initialData}>
                    <TestComponent />
                </ChessGameRoomProvider>
            );

            const currentPlayerColor = getByTestId('currentPlayerColor');
            await expect.element(currentPlayerColor).toHaveTextContent(expectedColor);
        }
    );

    it('throws when currentPlayerId does not match any color in colorToPlayerId', async () => {
        initialData.gameRoom.colorToPlayerId.white = 'player-1';
        initialData.gameRoom.colorToPlayerId.black = 'player-2';
        initialData.currentPlayerId = 'player-3';

        await expect(
            render(
                <ChessGameRoomProvider initialData={initialData}>
                    <TestComponent />
                </ChessGameRoomProvider>
            )
        ).rejects.toThrow('Current player color not found');
    });
});

describe('useChessClock', () => {
    it('throws when used outside of ChessGameRoomProvider', async () => {
        await expect(render(<ChessClockConsumer />)).rejects.toThrow(
            'Invariant failed: useChessClock must be used within ChessGameRoomProvider'
        );
    });

    it('returns clockState and clock actions from context', async () => {
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessClockConsumer />
            </ChessGameRoomProvider>
        );

        const baseTimeMs = getByTestId('clockState-baseTimeMs');
        await expect.element(baseTimeMs).toHaveTextContent(initialData.clockState!.baseTimeMs!.toString());
    });

    it('dispatches set-clocks action when setClocks is called', async () => {
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessClockConsumer />
            </ChessGameRoomProvider>
        );

        const baseTimeMs = getByTestId('clockState-baseTimeMs');
        await expect.element(baseTimeMs).toHaveTextContent(initialData.clockState!.baseTimeMs!.toString());

        const setClocksButton = getByTestId('setClocks-button');
        await setClocksButton.click();

        await expect.element(baseTimeMs).toHaveTextContent('555555');
    });

    describe('resetClocks', () => {
        it('dispatches reset-clocks action when resetClocks is called', async () => {
            initialData.clockState!.isPaused = true;
            initialData.gameRoom.timeControl = createMockTimeControl();

            const { getByTestId } = await render(
                <ChessGameRoomProvider initialData={initialData}>
                    <ChessClockConsumer />
                </ChessGameRoomProvider>
            );

            const isPaused = getByTestId('clockState-isPaused');
            const startClocksButton = getByTestId('startClocks-button');
            const resetClocksButton = getByTestId('resetClocks-button');

            await expect.element(isPaused).toHaveTextContent('true');

            await startClocksButton.click();
            await expect.element(isPaused).toHaveTextContent('false');

            await resetClocksButton.click();
            await expect.element(isPaused).toHaveTextContent('true');
        });

        it('does nothing when resetClocks is called and there is no time control', async () => {
            initialData.gameRoom.timeControl = null;

            const { getByTestId } = await render(
                <ChessGameRoomProvider initialData={initialData}>
                    <ChessClockConsumer />
                </ChessGameRoomProvider>
            );

            const baseTimeMs = getByTestId('clockState-baseTimeMs');
            const resetClocksButton = getByTestId('resetClocks-button');

            await expect.element(baseTimeMs).toHaveTextContent(initialData.clockState!.baseTimeMs!.toString());
            await resetClocksButton.click();
            await expect.element(baseTimeMs).toHaveTextContent('no-clock');
        });
    });
});

describe('useChessGame', () => {
    let promotionMove: Move;

    beforeEach(() => {
        promotionMove = createMockMove();
        promotionMove.startIndex = 7; // a7
        promotionMove.endIndex = 0; // a8
        promotionMove.piece = getPiece('P');
    });

    it('throws when used outside of ChessGameRoomProvider', async () => {
        await expect(render(<ChessGameConsumer />)).rejects.toThrow(
            'Invariant failed: useChessGame must be used within ChessGameRoomProvider'
        );
    });

    it('returns chessGame from context', async () => {
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessGameConsumer />
            </ChessGameRoomProvider>
        );

        const timelineVersion = getByTestId('chessGame-timelineVersion');
        await expect.element(timelineVersion).toHaveTextContent(initialData.chessGame.timelineVersion.toString());
    });

    describe('movePiece', () => {
        let mockMove: Move;

        beforeEach(() => {
            mockMove = createMockMove(); // e2e4
            initialData.chessGame.legalMovesStore = createMockLegalMovesStoreWithMove(mockMove);
        });

        const setupClockState = () => {
            initialData.clockState!.isPaused = true;
            initialData.clockState = chessClocksModule.createStartedClockState(initialData.clockState!, 'white', 1000);
        };

        it.each([
            {
                description: 'with clockState',
                setup: () => {
                    setupClockState();
                },
            },
            {
                description: 'without clockState',
                setup: () => {
                    initialData.clockState = null;
                },
            },
        ])('dispatches move-piece action when movePiece is called $description', async ({ setup }) => {
            setup();

            const { getByTestId } = await render(
                <ChessGameRoomProvider initialData={initialData}>
                    <ChessGameConsumer />
                </ChessGameRoomProvider>
            );

            const e2Square = getByTestId('chessGame-e2-square');
            const e4Square = getByTestId('chessGame-e4-square');
            const movePieceButton = getByTestId('movePiece-button');

            await expect.element(e2Square).toHaveTextContent('P');
            await expect.element(e4Square).toHaveTextContent('empty');

            await movePieceButton.click();

            await expect.element(e2Square).toHaveTextContent('empty');
            await expect.element(e4Square).toHaveTextContent('P');
        });

        it('ends the game if time has expired', async () => {
            vi.spyOn(chessClocksModule, 'computeGameStateBasedOnClock').mockReturnValue({
                status: 'time-out',
                winner: 'black',
            });

            setupClockState();
            initialData.clockState!.white.timeRemainingMs = 0;

            const { getByTestId } = await render(
                <ChessGameRoomProvider initialData={initialData}>
                    <ChessGameConsumer />
                </ChessGameRoomProvider>
            );

            const status = getByTestId('chessGame-status');
            const movePieceButton = getByTestId('movePiece-button');

            await expect.element(status).toHaveTextContent('in-progress');
            await movePieceButton.click();
            await expect.element(status).toHaveTextContent('time-out');
        });
    });

    it('dispatches promote-pawn action when promotePawn is called', async () => {
        initialData = createInitialData({ boardState: 'only-kings' });
        initialData.chessGame.boardState.board[0] = 'P'; // place a white pawn on a8 for promotion
        initialData.chessGame.pendingPromotion = {
            move: promotionMove,
            preChessGame: initialData.chessGame,
            prePreviousMoveIndices: [],
        };
        initialData.chessGame.legalMovesStore = createMockLegalMovesStoreWithMove(promotionMove);

        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessGameConsumer />
            </ChessGameRoomProvider>
        );

        const a8Square = getByTestId('chessGame-a8-square');
        const promotePawnButton = getByTestId('promotePawn-button');

        await expect.element(a8Square).toHaveTextContent('P');
        await promotePawnButton.click();
        await expect.element(a8Square).toHaveTextContent('Q');
    });

    it('dispatches cancel-promotion action when cancelPromotion is called', async () => {
        initialData = createInitialData({ boardState: 'only-kings' });
        initialData.chessGame.boardState.board[7] = 'P'; // place a white pawn on a7 for promotion
        initialData.clockState = null;
        initialData.chessGame.legalMovesStore = createMockLegalMovesStoreWithMove(promotionMove);

        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessGameConsumer />
            </ChessGameRoomProvider>
        );

        const a8Square = getByTestId('chessGame-a8-square');
        const a7Square = getByTestId('chessGame-a7-square');
        const movePieceButton = getByTestId('movePiece-button');
        const cancelPromotionButton = getByTestId('cancelPromotion-button');

        await expect.element(a7Square).toHaveTextContent('P');
        await expect.element(a8Square).toHaveTextContent('empty');

        await movePieceButton.click();
        await expect.element(a7Square).toHaveTextContent('empty');
        await expect.element(a8Square).toHaveTextContent('P');

        await cancelPromotionButton.click();
        await expect.element(a7Square).toHaveTextContent('P');
        await expect.element(a8Square).toHaveTextContent('empty');
    });

    it('dispatches load-fen action with default FEN when loadFEN is called without arguments', async () => {
        initialData = createInitialData({ boardState: 'only-kings' });
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessGameConsumer />
            </ChessGameRoomProvider>
        );

        const e2Square = getByTestId('chessGame-e2-square');
        const loadFENButton = getByTestId('loadFEN-without-args-button');

        await expect.element(e2Square).toHaveTextContent('empty');
        await loadFENButton.click();
        await expect.element(e2Square).toHaveTextContent('P');
    });

    it('dispatches load-fen action with provided FEN when loadFEN is called with argument', async () => {
        initialData = createInitialData({ boardState: 'only-kings' });
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessGameConsumer />
            </ChessGameRoomProvider>
        );

        const e2Square = getByTestId('chessGame-e2-square');
        const loadFENButton = getByTestId('loadFEN-with-args-button');

        await expect.element(e2Square).toHaveTextContent('empty');
        await loadFENButton.click();
        await expect.element(e2Square).toHaveTextContent('P');
    });

    it('dispatches end-game action when endGame is called', async () => {
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <ChessGameConsumer />
            </ChessGameRoomProvider>
        );

        const status = getByTestId('chessGame-status');
        const endGameButton = getByTestId('endGame-button');

        await expect.element(status).toHaveTextContent('in-progress');
        await endGameButton.click();
        await expect.element(status).toHaveTextContent('resigned');
    });
});

describe('useGameRoom', () => {
    it('throws when used outside of ChessGameRoomProvider', async () => {
        await expect(render(<GameRoomConsumer />)).rejects.toThrow(
            'Invariant failed: useGameRoom must be used within ChessGameRoomProvider'
        );
    });

    it('returns gameRoom and related values from context', async () => {
        const { getByTestId } = await render(
            <ChessGameRoomProvider initialData={initialData}>
                <GameRoomConsumer />
            </ChessGameRoomProvider>
        );

        const gameRoomType = getByTestId('gameRoom-type');
        const currentPlayerId = getByTestId('currentPlayerId');

        await expect.element(gameRoomType).toHaveTextContent(initialData.gameRoom.type);
        await expect.element(currentPlayerId).toHaveTextContent(initialData.currentPlayerId);
    });
});

describe('createSelfPlayChessGameRoomState', () => {
    it('creates a self-play room with two players and initial chess game', () => {
        expect(createSelfPlayChessGameRoomState(null)).toStrictEqual({
            chessGame: expect.objectContaining({
                timelineVersion: 1,
                pendingPromotion: null,
            }),
            gameRoom: expect.objectContaining({
                type: 'self',
                players: expect.arrayContaining([
                    expect.objectContaining({ id: 'player-1', displayName: 'White' }),
                    expect.objectContaining({ id: 'player-2', displayName: 'Black' }),
                ]),
                colorToPlayerId: {
                    white: 'player-1',
                    black: 'player-2',
                },
            }),
            clockState: null,
            messages: expect.any(Array),
            currentPlayerId: 'player-1',
        });
    });

    it('initializes clockState when time control is provided', () => {
        const timeControl = createMockTimeControl();
        const expectedClockState = chessClocksModule.createInitialChessClockState(timeControl);
        const state = createSelfPlayChessGameRoomState(timeControl);
        expect(state.clockState).toStrictEqual(expectedClockState);
    });
});
