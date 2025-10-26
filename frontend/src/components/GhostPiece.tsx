import type { PieceAlias } from '@grouchess/chess';

import type { DragProps } from './ChessBoard';

import { useImages } from '../providers/ImagesProvider';
import { aliasToPieceImageData } from '../utils/pieces';

type Props = {
    dragProps: DragProps;
    pieceAlias: PieceAlias;
};

/**
 * Ghost piece overlay following the pointer while dragging
 */
function GhostPiece({ dragProps, pieceAlias }: Props) {
    const { imgSrcMap } = useImages();
    const { x, y, squareSize } = dragProps;
    const { imgSrc, altText } = aliasToPieceImageData[pieceAlias];
    const resolvedImgSrc = imgSrcMap[imgSrc] ?? imgSrc;

    return (
        <div className="pointer-events-none absolute inset-0 z-10">
            <div
                style={{
                    position: 'absolute',
                    left: `${x - squareSize / 2}px`,
                    top: `${y - squareSize / 2}px`,
                    width: `${squareSize}px`,
                    height: `${squareSize}px`,
                }}
            >
                <img src={resolvedImgSrc} alt={altText} className="w-full h-full drop-shadow-lg" draggable={false} />
            </div>
        </div>
    );
}

export default GhostPiece;
