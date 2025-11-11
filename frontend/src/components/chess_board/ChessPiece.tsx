import { memo, type PointerEventHandler } from 'react';

import type { Piece } from '@grouchess/models';

import { useImages } from '../../providers/ImagesProvider';
import { aliasToPieceImageData } from '../../utils/pieces';

type Props = {
    piece: Piece;
    showTextDisplay: boolean;
    onPointerDown: PointerEventHandler<HTMLImageElement>;
    onImgLoadError: () => void;
};

function ChessPiece({ piece, showTextDisplay = false, onPointerDown, onImgLoadError }: Props) {
    const { imgSrcMap } = useImages();
    const { alias } = piece;
    const { altText, imgSrc } = aliasToPieceImageData[alias];

    if (showTextDisplay) {
        return (
            <span aria-label={altText} className="text-xl font-semibold select-none">
                {alias}
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

function arePropsEqual(prevProps: Props, nextProps: Props): boolean {
    // Compare piece by alias (pieces with same alias are identical)
    return (
        prevProps.piece.alias === nextProps.piece.alias &&
        prevProps.showTextDisplay === nextProps.showTextDisplay &&
        prevProps.onPointerDown === nextProps.onPointerDown &&
        prevProps.onImgLoadError === nextProps.onImgLoadError
    );
}

export default memo(ChessPiece, arePropsEqual);
