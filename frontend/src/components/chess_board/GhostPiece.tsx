import { memo } from 'react';

import type { PieceAlias } from '@grouchess/models';

import { useImages } from '../../providers/ImagesProvider';
import { aliasToPieceImageData } from '../../utils/pieces';
import type { Position, Rect } from '../../utils/types';
import DraggableItem from '../common/DraggableItem';

export type GhostPieceProps = {
    dragProps: Position & Rect;
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
 * Uses CSS transforms for hardware-accelerated smooth movement.
 */
function GhostPiece({ dragProps, pieceAlias }: GhostPieceProps) {
    return (
        <DraggableItem {...dragProps}>
            <DraggablePieceImage pieceAlias={pieceAlias} />
        </DraggableItem>
    );
}

export default GhostPiece;
