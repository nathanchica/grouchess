import {
    NUM_SQUARES,
    BoardIndexSchema,
    PieceTypeEnum,
    type SlidingPieceType,
    type RowColDeltas,
    BoardIndex,
} from '@grouchess/models';
import * as z from 'zod';

import { rowColToIndex, indexToRowCol } from './board.js';
import { ALL_DIRECTION_DELTAS, KNIGHT_DELTAS } from './constants.js';

export const NonSlidingPieceTargetsAtIndexSchema = z.set(BoardIndexSchema);
export type NonSlidingPieceTargetsAtIndex = z.infer<typeof NonSlidingPieceTargetsAtIndexSchema>;

export const NonSlidingPieceTargetsSchema = z
    .array(NonSlidingPieceTargetsAtIndexSchema)
    .describe(
        'Precomputed targets for each square for a given piece type (i.e. targets[square] = [list of target squares])'
    );
export type NonSlidingPieceTargets = z.infer<typeof NonSlidingPieceTargetsSchema>;

export const StepDirectionEnum = z.enum([
    'up',
    'down',
    'left',
    'right',
    'up-left',
    'up-right',
    'down-left',
    'down-right',
]);
export type StepDirection = z.infer<typeof StepDirectionEnum>;

export const QueenTargetsAtIndexSchema = z
    .record(StepDirectionEnum, z.array(BoardIndexSchema))
    .describe('Precomputed queen targets at a given index organized by direction');
export type QueenTargetsAtIndex = z.infer<typeof QueenTargetsAtIndexSchema>;

export const RookTargetsAtIndexSchema = z
    .record(StepDirectionEnum.extract(['up', 'down', 'left', 'right']), z.array(BoardIndexSchema))
    .describe('Precomputed rook targets at a given index organized by direction');
export type RookTargetsAtIndex = z.infer<typeof RookTargetsAtIndexSchema>;

export const BishopTargetsAtIndexSchema = z
    .record(StepDirectionEnum.extract(['up-left', 'up-right', 'down-left', 'down-right']), z.array(BoardIndexSchema))
    .describe('Precomputed bishop targets at a given index organized by direction');
export type BishopTargetsAtIndex = z.infer<typeof BishopTargetsAtIndexSchema>;

export const QueenTargetsSchema = z.array(QueenTargetsAtIndexSchema).length(NUM_SQUARES);
export type QueenTargets = z.infer<typeof QueenTargetsSchema>;

export const RookTargetsSchema = z.array(RookTargetsAtIndexSchema).length(NUM_SQUARES);
export type RookTargets = z.infer<typeof RookTargetsSchema>;

export const BishopTargetsSchema = z.array(BishopTargetsAtIndexSchema).length(NUM_SQUARES);
export type BishopTargets = z.infer<typeof BishopTargetsSchema>;

export const PrecomputeResultSchema = z
    .object({
        king: NonSlidingPieceTargetsSchema,
        knight: NonSlidingPieceTargetsSchema,
        bishop: BishopTargetsSchema,
        rook: RookTargetsSchema,
        queen: QueenTargetsSchema,
    })
    .describe('Precomputed move targets for all piece types except pawns');
export type PrecomputeResult = z.infer<typeof PrecomputeResultSchema>;

export const STEP_DIRECTION_DELTAS: Record<StepDirection, [number, number]> = {
    up: [-1, 0],
    down: [1, 0],
    left: [0, -1],
    right: [0, 1],
    'up-left': [-1, -1],
    'up-right': [-1, 1],
    'down-left': [1, -1],
    'down-right': [1, 1],
};

export const SLIDING_PIECE_TYPE_TO_STEP_DIRECTIONS = {
    bishop: ['down-right', 'down-left', 'up-left', 'up-right'],
    rook: ['right', 'left', 'down', 'up'],
    queen: ['down-right', 'down-left', 'up-left', 'up-right', 'right', 'left', 'down', 'up'],
} as const satisfies Record<SlidingPieceType, readonly StepDirection[]>;

/**
 * Creates an empty NonSlidingPieceTargets structure with no targets.
 */
function createEmptyResults(): NonSlidingPieceTargets {
    return [...new Array(NUM_SQUARES)].map(() => new Set());
}

/**
 * Computes move targets for a piece.
 * @param rowColDeltas The row and column deltas for the piece's movement.
 * @returns A set of target squares for the piece.
 */
export function computeNonSlidingTargets(rowColDeltas: RowColDeltas): NonSlidingPieceTargets {
    const result: NonSlidingPieceTargets = createEmptyResults();

    for (let index = 0; index < NUM_SQUARES; index++) {
        const { row, col } = indexToRowCol(index);
        rowColDeltas.forEach(([rowDelta, colDelta]) => {
            const targetIndex = rowColToIndex({ row: row + rowDelta, col: col + colDelta });
            if (targetIndex > -1) result[index].add(targetIndex);
        });
    }

    return result;
}

/**
 * Computes move targets for the king piece.
 */
export function computeKingTargets(): NonSlidingPieceTargets {
    return computeNonSlidingTargets(ALL_DIRECTION_DELTAS);
}

/**
 * Computes move targets for the knight piece.
 */
export function computeKnightTargets(): NonSlidingPieceTargets {
    return computeNonSlidingTargets(KNIGHT_DELTAS);
}

// Utility to create a direction->indices map with precise keys
function createEmptyDirectionMap<D extends readonly StepDirection[]>(directions: D): Record<D[number], number[]> {
    const map = {} as Record<D[number], number[]>;
    for (const dir of directions) map[dir as D[number]] = [];
    return map;
}

type TargetsForSlidingPiece<T extends SlidingPieceType> = T extends 'rook'
    ? RookTargets
    : T extends 'bishop'
      ? BishopTargets
      : QueenTargets;

/**
 * Computes move targets for a sliding piece.
 */
export function computeSlidingTargets<T extends SlidingPieceType>(pieceType: T): TargetsForSlidingPiece<T> {
    const directions = SLIDING_PIECE_TYPE_TO_STEP_DIRECTIONS[
        pieceType
    ] as (typeof SLIDING_PIECE_TYPE_TO_STEP_DIRECTIONS)[T];
    type Dir = (typeof SLIDING_PIECE_TYPE_TO_STEP_DIRECTIONS)[T][number];

    const result = new Array(NUM_SQUARES) as unknown as Array<Record<Dir, number[]>>;

    for (let index = 0; index < NUM_SQUARES; index++) {
        const { row, col } = indexToRowCol(index);
        const directionMap = createEmptyDirectionMap(directions);

        directions.forEach((direction: Dir) => {
            const [rowDelta, colDelta] = STEP_DIRECTION_DELTAS[direction];
            let step = 1;
            let targetIndex = rowColToIndex({ row: row + rowDelta, col: col + colDelta });
            while (targetIndex > -1) {
                directionMap[direction].push(targetIndex);
                step++;
                targetIndex = rowColToIndex({ row: row + rowDelta * step, col: col + colDelta * step });
            }
        });

        result[index] = directionMap;
    }

    return result as TargetsForSlidingPiece<T>;
}

/**
 * Computes move targets for the bishop piece.
 */
export function computeBishopTargets(): BishopTargets {
    return computeSlidingTargets('bishop');
}

/**
 * Computes move targets for the rook piece.
 */
export function computeRookTargets(): RookTargets {
    return computeSlidingTargets('rook');
}

/**
 * Computes move targets for the queen piece.
 */
export function computeQueenTargets(): QueenTargets {
    return computeSlidingTargets('queen');
}

/**
 * Computes move targets for all non-pawn piece types.
 */
export function computeNonPawnTargets(): PrecomputeResult {
    return {
        king: computeKingTargets(),
        knight: computeKnightTargets(),
        bishop: computeBishopTargets(),
        rook: computeRookTargets(),
        queen: computeQueenTargets(),
    };
}

export const PRECOMPUTED_NON_PAWN_TARGETS: PrecomputeResult = computeNonPawnTargets();

export const PieceTypeWithTargetsEnum = PieceTypeEnum.exclude(['pawn']);
export type PieceTypeWithTargets = z.infer<typeof PieceTypeWithTargetsEnum>;

export type TargetsForPieceAtIndex<T extends PieceTypeWithTargets> = T extends 'king' | 'knight'
    ? NonSlidingPieceTargetsAtIndex
    : T extends 'bishop'
      ? BishopTargetsAtIndex
      : T extends 'rook'
        ? RookTargetsAtIndex
        : QueenTargetsAtIndex;

export type TargetsForPieceType<T extends PieceTypeWithTargets> = T extends 'king' | 'knight'
    ? NonSlidingPieceTargets
    : T extends 'bishop'
      ? BishopTargets
      : T extends 'rook'
        ? RookTargets
        : QueenTargets;

/**
 * Gets the precomputed move targets for a piece type at a given square index.
 */
export function getTargetsAtIndex<T extends PieceTypeWithTargets>(
    squareIndex: BoardIndex,
    pieceType: T
): TargetsForPieceAtIndex<T> {
    const targetsForPiece = PRECOMPUTED_NON_PAWN_TARGETS[pieceType] as TargetsForPieceType<T>;
    return targetsForPiece[squareIndex] as TargetsForPieceAtIndex<T>;
}
