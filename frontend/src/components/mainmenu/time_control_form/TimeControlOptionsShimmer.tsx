const NUM_SHIMMERS = 6;

function TimeControlOptionsShimmer() {
    return (
        <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: NUM_SHIMMERS }).map((_, index) => (
                <div
                    key={`time-control-shimmer-${index}`}
                    className="h-16 animate-pulse rounded-2xl bg-emerald-500/10"
                />
            ))}
        </div>
    );
}

export default TimeControlOptionsShimmer;
