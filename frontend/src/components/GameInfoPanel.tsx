import InfoCard from './InfoCard';
import ResetButton from './ResetButton';

import { useChessGame } from '../providers/ChessGameProvider';
import { type MoveNotation } from '../utils/notations';

function createMovePairs(allMoves: MoveNotation[]): MoveNotation[][] {
    if (allMoves.length === 0) return [];

    const result: MoveNotation[][] = [];
    for (let i = 0; i < allMoves.length; i += 2) {
        result.push(allMoves.slice(i, i + 2));
    }

    return result;
}

function GameInfoPanel() {
    const { moveHistory } = useChessGame();

    const movePairs = createMovePairs(moveHistory);

    return (
        <InfoCard className="h-full">
            <div className="p-8 flex flex-col gap-1 h-full">
                {movePairs.map(([whiteMove, blackMove], index) => (
                    <div key={`move-history-${index}`} className="grid grid-cols-12 gap-8">
                        <span className="text-zinc-100 col-span-2 text-center">{index + 1}.</span>
                        <span className="text-zinc-100 col-span-5">{whiteMove.algebraicNotation}</span>
                        {blackMove && <span className="text-zinc-100 col-span-5">{blackMove.algebraicNotation}</span>}
                    </div>
                ))}
                <div className="grow" />
                <ResetButton />
            </div>
        </InfoCard>
    );
}

export default GameInfoPanel;
