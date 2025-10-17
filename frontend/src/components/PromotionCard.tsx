import { type CSSProperties } from 'react';

import { useImages } from '../providers/ImagesProvider';
import { getPiece, type PawnPromotion } from '../utils/pieces';

type Props = {
    onSelect: (option: PawnPromotion) => void;
    options: PawnPromotion[]; // Render order top->bottom
    squareSize?: number; // optional explicit sizing
    style?: CSSProperties; // absolute positioning from parent
};

function PromotionCard({ onSelect, options, squareSize, style }: Props) {
    const { isReady: isImagesLoaded, imgSrcMap } = useImages();
    const optionSize = squareSize ? `${squareSize}px` : undefined;

    return (
        <div
            className="absolute z-30"
            style={{
                width: optionSize,
                height: squareSize ? `${squareSize * options.length}px` : undefined,
                ...style,
            }}
            onClick={(event) => event.stopPropagation()}
        >
            <div className="flex flex-col overflow-hidden shadow-lg shadow-black/40 bg-zinc-800">
                {options.map((pieceAlias) => {
                    const { imgSrc: origImgSrc, altText } = getPiece(pieceAlias);
                    const imgSrc = imgSrcMap[origImgSrc] ?? origImgSrc;
                    return (
                        <button
                            key={pieceAlias}
                            type="button"
                            className="bg-zinc-800 hover:bg-zinc-700 focus:outline-none focus:bg-zinc-700 cursor-pointer"
                            style={{ width: optionSize, height: optionSize }}
                            onClick={() => onSelect(pieceAlias)}
                            aria-label={`Promote to ${altText}`}
                        >
                            {isImagesLoaded ? (
                                <img src={imgSrc} alt={altText} className="w-full h-full" />
                            ) : (
                                <span className="text-zinc-100 text-xl w-full h-full grid place-items-center">
                                    {pieceAlias}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export default PromotionCard;
