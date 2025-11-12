import { render } from 'vitest-browser-react';

import { ChessGameContext, type ChessGameContextType } from '../../../providers/ChessGameRoomProvider';
import { createMockChessGameContextValues } from '../../../providers/__mocks__/ChessGameRoomProvider';
import MainSection from '../MainSection';

vi.mock('../ChessBoard', () => {
    return {
        default: function MockChessBoard() {
            return <div data-testid="chess-board">Mock ChessBoard</div>;
        },
    };
});

type RenderMainSectionOptions = {
    chessGameContextValues?: ChessGameContextType;
};
function renderMainSection({ chessGameContextValues }: RenderMainSectionOptions = {}) {
    const contextValue = chessGameContextValues ?? createMockChessGameContextValues();
    return render(
        <ChessGameContext.Provider value={contextValue}>
            <MainSection />
        </ChessGameContext.Provider>
    );
}

describe('MainSection', () => {
    it('renders ChessBoard component', async () => {
        const { getByTestId } = await renderMainSection();
        const chessBoard = getByTestId('chess-board');
        await expect.element(chessBoard).toBeInTheDocument();
    });
});
