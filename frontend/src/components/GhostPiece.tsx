import type { DragProps } from './ChessBoard';

import { useImages } from '../providers/ImagesProvider';

type Props = {
    dragProps: DragProps;
    pieceImgSrc: string;
    imgAltText: string;
};

/**
 * Ghost piece overlay following the pointer while dragging
 */
function GhostPiece({ dragProps, pieceImgSrc, imgAltText }: Props) {
    const { imgSrcMap } = useImages();
    const { x, y, squareSize } = dragProps;
    const imgSrc = imgSrcMap[pieceImgSrc] ?? pieceImgSrc;

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
                <img src={imgSrc} alt={imgAltText} className="w-full h-full drop-shadow-lg" draggable={false} />
            </div>
        </div>
    );
}

export default GhostPiece;
