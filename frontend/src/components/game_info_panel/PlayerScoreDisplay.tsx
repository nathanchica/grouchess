type Props = {
    name: string;
    score: number;
};

function PlayerScoreDisplay({ name, score }: Props) {
    return (
        <span className="lg:text-lg text-sm text-zinc-100">
            {name} <span className="text-zinc-400 lg:text-sm text-xs">({score})</span>
        </span>
    );
}

export default PlayerScoreDisplay;
