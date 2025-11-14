import {
    createMockChessGameState,
    createMockMoveNotation,
    createMockMoveRecord,
    createMockPieceCapture,
} from '@grouchess/test-utils';
import { render } from 'vitest-browser-react';

import { ChessGameContext, type ChessGameContextType } from '../../../providers/ChessGameRoomProvider';
import { SoundContext, type SoundContextValue } from '../../../providers/SoundProvider';
import { createMockChessGameContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import { createMockSoundContextValues } from '../../../providers/__mocks__/SoundProvider';
import * as windowUtils from '../../../utils/window';
import SoundEffects, { CHECK_DELAY_MS, getGameEndSoundName, getMoveSoundName } from '../SoundEffects';

vi.mock('../../../utils/window', { spy: true });

const setTimeoutMock = vi.mocked(windowUtils.setTimeout);
const clearTimeoutMock = vi.mocked(windowUtils.clearTimeout);

type RenderSoundEffectsOptions = {
    chessGameContextValues?: ChessGameContextType;
    soundContextValues?: SoundContextValue;
};

const createMoveHistory = (...sanMoves: string[]) =>
    sanMoves.map((san) =>
        createMockMoveRecord({
            notation: createMockMoveNotation({ san }),
        })
    );

async function renderSoundEffects(initialOptions: RenderSoundEffectsOptions = {}) {
    const buildProviders = ({
        chessGameContextValues = createMockChessGameContextValues(),
        soundContextValues = createMockSoundContextValues(),
    }: RenderSoundEffectsOptions = {}) => {
        return (
            <SoundContext.Provider value={soundContextValues}>
                <ChessGameContext.Provider value={chessGameContextValues}>
                    <SoundEffects />
                </ChessGameContext.Provider>
            </SoundContext.Provider>
        );
    };

    const renderResult = await render(buildProviders(initialOptions));

    const rerenderSoundEffects = (nextOptions: RenderSoundEffectsOptions = {}) => {
        renderResult.rerender(buildProviders(nextOptions));
    };

    return {
        ...renderResult,
        rerenderSoundEffects,
    };
}

describe('getMoveSoundName', () => {
    it.each([
        { san: 'Qxd5', isCapture: true, expected: 'capture' },
        { san: 'O-O', isCapture: false, expected: 'castle' },
        { san: 'e8=Q', isCapture: false, expected: 'promote' },
        { san: 'Nf3', isCapture: false, expected: 'move' },
    ])('returns $expected for san=$san (capture: $isCapture)', ({ san, isCapture, expected }) => {
        expect(getMoveSoundName(san, isCapture)).toBe(expected);
    });
});

describe('getGameEndSoundName', () => {
    it.each([
        { status: 'checkmate', winner: 'white', expected: 'victory' },
        { status: 'resigned', winner: 'black', expected: 'defeat' },
        { status: 'time-out', winner: 'white', expected: 'victory' },
    ] as const)('returns $expected for $status with winner $winner', ({ status, winner, expected }) => {
        expect(getGameEndSoundName(status, winner)).toBe(expected);
    });

    it.each([
        'stalemate',
        'draw-by-agreement',
        '50-move-draw',
        'threefold-repetition',
        'insufficient-material',
    ] as const)('returns draw for %s', (status) => {
        expect(getGameEndSoundName(status)).toBe('draw');
    });

    it('returns null when game is still in progress', () => {
        expect(getGameEndSoundName('in-progress')).toBeNull();
    });

    it('throws when winner is missing for decisive statuses', () => {
        expect(() => getGameEndSoundName('checkmate')).toThrow('Winner must be defined');
    });
});

describe('SoundEffects', () => {
    let chessGameContextValues: ChessGameContextType;
    let soundContextValues: SoundContextValue;

    beforeEach(() => {
        chessGameContextValues = createMockChessGameContextValues();
        soundContextValues = createMockSoundContextValues();
        setTimeoutMock.mockReset();
        clearTimeoutMock.mockReset();
    });

    it('does not play any sound when there are no moves', async () => {
        const playMock = vi.fn();
        soundContextValues.play = playMock;

        await renderSoundEffects({ soundContextValues });

        expect(playMock).not.toHaveBeenCalled();
        expect(setTimeoutMock).not.toHaveBeenCalled();
    });

    it('plays move sound when a new move is added', async () => {
        const { rerenderSoundEffects } = await renderSoundEffects();

        const playMock = vi.fn();
        soundContextValues.play = playMock;
        chessGameContextValues.chessGame.moveHistory = createMoveHistory('e4');
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).toHaveBeenCalledTimes(1);
        expect(playMock).toHaveBeenCalledWith('move');
        expect(setTimeoutMock).not.toHaveBeenCalled();
    });

    it('plays capture sound when the last move was a capture', async () => {
        const { rerenderSoundEffects } = await renderSoundEffects();

        const playMock = vi.fn();
        soundContextValues.play = playMock;
        chessGameContextValues.chessGame.moveHistory = createMoveHistory('Qxd5');
        chessGameContextValues.chessGame.captures = [createMockPieceCapture({ moveIndex: 0 })];

        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).toHaveBeenCalledWith('capture');
        expect(setTimeoutMock).not.toHaveBeenCalled();
    });

    it('does not play sound when a move is removed after being added', async () => {
        const playMock = vi.fn();
        soundContextValues.play = playMock;
        chessGameContextValues.chessGame.moveHistory = createMoveHistory('e4');

        const { rerenderSoundEffects } = await renderSoundEffects({ chessGameContextValues, soundContextValues });

        chessGameContextValues.chessGame.moveHistory = createMoveHistory('e4', 'e5');
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).toHaveBeenCalledWith('move');
        playMock.mockClear();

        chessGameContextValues.chessGame.moveHistory = createMoveHistory('e4');
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).not.toHaveBeenCalled();
        expect(setTimeoutMock).not.toHaveBeenCalled();
        expect(clearTimeoutMock).not.toHaveBeenCalled();
    });

    it.each([
        { san: 'Qh5+', description: 'check', expectedSound: 'move', captureIndices: [] },
        { san: 'Qh8#', description: 'checkmate', expectedSound: 'move', captureIndices: [] },
        { san: 'Qxf7+', description: 'capture that checks', expectedSound: 'capture', captureIndices: [0] },
    ])(
        'schedules a check sound when move ends in $description notation',
        async ({ san, expectedSound, captureIndices }) => {
            const { rerenderSoundEffects } = await renderSoundEffects();

            const playMock = vi.fn();
            soundContextValues.play = playMock;

            let scheduledCallback: (() => void) | null = null;
            const timerId = 101;
            setTimeoutMock.mockImplementation((callback: () => void, _delay: number) => {
                scheduledCallback = callback;
                return timerId;
            });

            chessGameContextValues.chessGame.moveHistory = createMoveHistory(san);
            chessGameContextValues.chessGame.captures = captureIndices.map((moveIndex) =>
                createMockPieceCapture({ moveIndex })
            );
            rerenderSoundEffects({ chessGameContextValues, soundContextValues });

            expect(playMock).toHaveBeenCalledWith(expectedSound);
            expect(setTimeoutMock).toHaveBeenCalledWith(expect.any(Function), CHECK_DELAY_MS);
            expect(clearTimeoutMock).not.toHaveBeenCalled();

            scheduledCallback!();
            expect(playMock).toHaveBeenCalledWith('check');
        }
    );

    it('clears a pending check timeout before scheduling another', async () => {
        const { rerenderSoundEffects } = await renderSoundEffects();

        const playMock = vi.fn();
        soundContextValues.play = playMock;

        const timerIds = [11, 22];
        let callIndex = 0;
        setTimeoutMock.mockImplementation((_callback: () => void, _delay: number) => {
            callIndex += 1;
            return timerIds[callIndex - 1];
        });

        chessGameContextValues.chessGame.moveHistory = createMoveHistory('Qh5+');
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        chessGameContextValues.chessGame.moveHistory = createMoveHistory('Qh5+', 'Qxf7#');
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(clearTimeoutMock).toHaveBeenCalledTimes(1);
        expect(clearTimeoutMock).toHaveBeenCalledWith(timerIds[0]);
        expect(setTimeoutMock).toHaveBeenCalledTimes(2);
    });

    it('clears pending check timeout on unmount', async () => {
        const { rerenderSoundEffects, unmount } = await renderSoundEffects();

        const playMock = vi.fn();
        soundContextValues.play = playMock;

        const timerId = 555;
        setTimeoutMock.mockReturnValue(timerId);

        chessGameContextValues.chessGame.moveHistory = createMoveHistory('Qh5+');
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(clearTimeoutMock).not.toHaveBeenCalled();

        unmount();

        expect(clearTimeoutMock).toHaveBeenCalledTimes(1);
        expect(clearTimeoutMock).toHaveBeenCalledWith(timerId);
    });

    it('plays endgame sound when status changes to a finished state', async () => {
        const { rerenderSoundEffects } = await renderSoundEffects();

        const playMock = vi.fn();
        soundContextValues.play = playMock;

        chessGameContextValues.chessGame.gameState = createMockChessGameState({ status: 'checkmate', winner: 'white' });
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).toHaveBeenCalledWith('victory');

        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).toHaveBeenCalledTimes(1);
    });

    it('does not play sound when status returns to in-progress', async () => {
        const { rerenderSoundEffects } = await renderSoundEffects();

        const playMock = vi.fn();
        soundContextValues.play = playMock;

        chessGameContextValues.chessGame.gameState = createMockChessGameState({
            status: 'draw-by-agreement',
        });
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).toHaveBeenCalledWith('draw');
        playMock.mockClear();

        chessGameContextValues.chessGame.gameState = createMockChessGameState({
            status: 'in-progress',
        });
        rerenderSoundEffects({ chessGameContextValues, soundContextValues });

        expect(playMock).not.toHaveBeenCalled();
    });
});
