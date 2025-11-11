export type CaptureOverlayProps = {
    isDarkSquare: boolean;
};

/**
 * Renders a capture overlay on a chess square.
 */
function CaptureOverlay({ isDarkSquare }: CaptureOverlayProps) {
    const borderColor = isDarkSquare ? 'border-emerald-300/90' : 'border-emerald-300/80';
    return (
        <span className="pointer-events-none absolute inset-0 transition-opacity group-hover:opacity-0">
            <span className={`absolute left-0.5 top-0.5 h-4 w-4 border-t-6 border-l-6 ${borderColor}`} />
            <span className={`absolute right-0.5 top-0.5 h-4 w-4 border-t-6 border-r-6 ${borderColor}`} />
            <span className={`absolute left-0.5 bottom-0.5 h-4 w-4 border-b-6 border-l-6 ${borderColor}`} />
            <span className={`absolute right-0.5 bottom-0.5 h-4 w-4 border-b-6 border-r-6 ${borderColor}`} />
        </span>
    );
}

export default CaptureOverlay;
