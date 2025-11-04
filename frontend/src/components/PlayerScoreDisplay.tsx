import type { PieceColor } from '@grouchess/models';

import ChessKingIcon from '../assets/icons/chess-king.svg?react';

type Props = {
    name: string;
    color: PieceColor;
    score?: number;
};

function PlayerScoreDisplay({ name, score, color }: Props) {
    return (
        <div className="flex min-w-0 flex-row items-center gap-1.5">
            <ChessKingIcon
                className={`size-6 pb-0.5 shrink-0 ${color === 'white' ? 'text-zinc-200' : 'text-zinc-950'}`}
            />
            <div className="flex min-w-0 items-baseline">
                <span className="flex-1 truncate lg:text-lg text-sm font-semibold text-zinc-100" title={name}>
                    {name}
                </span>
                {score !== undefined && <span className="text-zinc-400 text-sm shrink-0 ml-1">({score})</span>}
            </div>
        </div>
    );
}

export default PlayerScoreDisplay;
