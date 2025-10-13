import type { PointerEventHandler } from 'react';
import { type Piece } from '../utils/pieces';

import { useImages } from '../providers/ImagesProvider';

type Props = {
    piece: Piece;
    showTextDisplay: boolean;
    onPointerDown: PointerEventHandler<HTMLImageElement>;
    onImgLoadError: () => void;
};

function ChessPiece({ piece, showTextDisplay = false, onPointerDown, onImgLoadError }: Props) {
    const { imgSrcMap } = useImages();
    const { altText, shortAlias, imgSrc } = piece;

    if (showTextDisplay) {
        return (
            <span aria-label={altText} className="text-xl font-semibold select-none">
                {shortAlias}
            </span>
        );
    }

    return (
        <img
            className="w-full h-full"
            src={imgSrcMap[imgSrc] ?? imgSrc}
            loading="eager"
            decoding="async"
            alt={altText}
            draggable={false}
            onPointerDown={onPointerDown}
            onError={onImgLoadError}
        />
    );
}

export default ChessPiece;
