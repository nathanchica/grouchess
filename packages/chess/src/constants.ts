import type { CastleRights } from './schema.js';

/**
 * 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7  (0)
 * ------------------------------
 * 8 | 9 | 10| 11| 12| 13| 14| 15 (1)
 * ------------------------------
 * 16| 17| 18| 19| 20| 21| 22| 23 (2)
 * ------------------------------
 * 24| 25| 26| 27| 28| 29| 30| 31 (3)
 * ------------------------------
 * 32| 33| 34| 35| 36| 37| 38| 39 (4)
 * ------------------------------
 * 40| 41| 42| 43| 44| 45| 46| 47 (5)
 * ------------------------------
 * 48| 49| 50| 51| 52| 53| 54| 55 (6)
 * ------------------------------
 * 56| 57| 58| 59| 60| 61| 62| 63 (7)
 */

export const WHITE_KING_SHORT_CASTLE_INDEX = 62;
export const WHITE_KING_LONG_CASTLE_INDEX = 58;
export const WHITE_SHORT_ROOK_START_INDEX = 63;
export const WHITE_SHORT_ROOK_END_INDEX = 61;
export const WHITE_LONG_ROOK_START_INDEX = 56;
export const WHITE_LONG_ROOK_END_INDEX = 59;
export const WHITE_SHORT_CASTLE_INDICES = [61, 62];
export const WHITE_LONG_CASTLE_EMPTY_INDICES = [57, 58, 59];
export const WHITE_LONG_CASTLE_SAFE_INDICES = [58, 59];

export const BLACK_KING_SHORT_CASTLE_INDEX = 6;
export const BLACK_KING_LONG_CASTLE_INDEX = 2;
export const BLACK_SHORT_ROOK_START_INDEX = 7;
export const BLACK_SHORT_ROOK_END_INDEX = 5;
export const BLACK_LONG_ROOK_START_INDEX = 0;
export const BLACK_LONG_ROOK_END_INDEX = 3;
export const BLACK_SHORT_CASTLE_INDICES = [5, 6];
export const BLACK_LONG_CASTLE_EMPTY_INDICES = [1, 2, 3];
export const BLACK_LONG_CASTLE_SAFE_INDICES = [2, 3];

export const ROOK_START_INDEX_TO_CASTLE_RIGHT: Record<number, keyof CastleRights> = {
    [WHITE_SHORT_ROOK_START_INDEX]: 'short',
    [WHITE_LONG_ROOK_START_INDEX]: 'long',
    [BLACK_SHORT_ROOK_START_INDEX]: 'short',
    [BLACK_LONG_ROOK_START_INDEX]: 'long',
};

export const WHITE_PAWN_STARTING_ROW = 6;
export const BLACK_PAWN_STARTING_ROW = 1;
