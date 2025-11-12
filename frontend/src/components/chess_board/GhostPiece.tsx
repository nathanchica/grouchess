import { forwardRef, memo } from 'react';

import type { PieceAlias } from '@grouchess/models';

import { useImages } from '../../providers/ImagesProvider';
import { aliasToPieceImageData } from '../../utils/pieces';
import DraggableItem from '../common/DraggableItem';

export type GhostPieceProps = {
    squareSize: number;
    initialX: number;
    initialY: number;
    pieceAlias: PieceAlias;
};

/**
 * Memoized piece image - won't re-render during drag movements
 */
const DraggablePieceImage = memo(({ pieceAlias }: { pieceAlias: PieceAlias }) => {
    const { imgSrcMap } = useImages();
    const { imgSrc, altText } = aliasToPieceImageData[pieceAlias];
    const resolvedImgSrc = imgSrcMap[imgSrc] ?? imgSrc;

    return (
        <img
            src={resolvedImgSrc}
            alt={altText}
            className="w-full h-full drop-shadow-lg will-change-[filter]"
            draggable={false}
        />
    );
});

DraggablePieceImage.displayName = 'DraggablePieceImage';

/**
 * Ghost piece overlay following the pointer while dragging.
 * Position is updated via ref for optimal performance (no re-renders on mouse move).
 * Initial position is set via inline style for the first render.
 */
const GhostPiece = forwardRef<HTMLDivElement, GhostPieceProps>(
    ({ squareSize, initialX, initialY, pieceAlias }, ref) => {
        return (
            <DraggableItem ref={ref} x={initialX} y={initialY} width={squareSize} height={squareSize}>
                <DraggablePieceImage pieceAlias={pieceAlias} />
            </DraggableItem>
        );
    }
);

GhostPiece.displayName = 'GhostPiece';

export default GhostPiece;
