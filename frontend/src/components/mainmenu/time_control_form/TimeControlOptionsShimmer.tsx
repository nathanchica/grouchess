const NUM_SHIMMERS = 6;

function TimeControlOptionsShimmer() {
    return (
        <div role="status" aria-label="Loading time control options..." className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: NUM_SHIMMERS }).map((_, index) => (
                <div
                    key={`time-control-shimmer-${index}`}
                    className="h-16 animate-pulse rounded-2xl bg-emerald-500/10"
                    aria-hidden="true"
                />
            ))}
        </div>
    );
}

export default TimeControlOptionsShimmer;
