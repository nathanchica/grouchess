import type { PieceAlias } from '@grouchess/models';

import { PAWN_PROMOTION_OPTIONS, aliasToPieceImageData, uniquePieceImgSrcs } from '../pieces';

describe('PAWN_PROMOTION_OPTIONS', () => {
    it('has 4 promotion options for each color', () => {
        expect(PAWN_PROMOTION_OPTIONS.white).toHaveLength(4);
        expect(PAWN_PROMOTION_OPTIONS.black).toHaveLength(4);
    });

    it.each([
        { piece: 'Q' as const, description: 'Queen' },
        { piece: 'R' as const, description: 'Rook' },
        { piece: 'B' as const, description: 'Bishop' },
        { piece: 'N' as const, description: 'Knight' },
    ])('white promotions include $description ($piece)', ({ piece }) => {
        expect(PAWN_PROMOTION_OPTIONS.white).toContain(piece);
    });

    it.each([
        { piece: 'q' as const, description: 'Queen' },
        { piece: 'r' as const, description: 'Rook' },
        { piece: 'b' as const, description: 'Bishop' },
        { piece: 'n' as const, description: 'Knight' },
    ])('black promotions include $description ($piece)', ({ piece }) => {
        expect(PAWN_PROMOTION_OPTIONS.black).toContain(piece);
    });

    it('excludes pawns and kings from promotions', () => {
        const allPromotions = [...PAWN_PROMOTION_OPTIONS.white, ...PAWN_PROMOTION_OPTIONS.black];
        expect(allPromotions).not.toContain('P');
        expect(allPromotions).not.toContain('p');
        expect(allPromotions).not.toContain('K');
        expect(allPromotions).not.toContain('k');
    });
});

describe('aliasToPieceImageData', () => {
    const allPieceAliases: PieceAlias[] = ['p', 'r', 'n', 'b', 'q', 'k', 'P', 'R', 'N', 'B', 'Q', 'K'];

    it('contains entries for all 12 piece aliases', () => {
        const keys = Object.keys(aliasToPieceImageData);
        expect(keys).toHaveLength(12);
        allPieceAliases.forEach((alias) => {
            expect(keys).toContain(alias);
        });
    });

    it('generates unique image sources for each piece', () => {
        const imgSrcs = Object.values(aliasToPieceImageData).map((data) => data.imgSrc);
        const uniqueSrcs = new Set(imgSrcs);
        expect(uniqueSrcs.size).toBe(12);
    });
});

describe('uniquePieceImgSrcs', () => {
    it('contains exactly 12 unique image paths', () => {
        expect(uniquePieceImgSrcs).toHaveLength(12);
        const uniqueSet = new Set(uniquePieceImgSrcs);
        expect(uniqueSet.size).toBe(12);
    });

    it('includes all image sources from aliasToPieceImageData', () => {
        const allImgSrcs = Object.values(aliasToPieceImageData).map((data) => data.imgSrc);
        allImgSrcs.forEach((imgSrc) => {
            expect(uniquePieceImgSrcs).toContain(imgSrc);
        });
    });
});
