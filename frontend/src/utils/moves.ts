import { indexToRowCol, rowColToIndex, NUM_ROWS, NUM_COLS } from './board';
import type { Piece, ChessBoardType } from './pieces';

type RowColDeltas = Array<[number, number]>;
const DIAGONAL_DELTAS: RowColDeltas = [
    [1, 1], // down-right
    [1, -1], // down-left
    [-1, -1], // up-left
    [-1, 1], // up-right
];
const STRAIGHT_DELTAS: RowColDeltas = [
    [0, 1], // right
    [0, -1], // left
    [1, 0], // down
    [-1, 0], // up
];
const KNIGHT_DELTAS: RowColDeltas = [
    [2, 1], // down2 right1
    [1, 2], // down1 right2
    [-1, 2], // up1 right2
    [-2, 1], // up2 right1
    [-2, -1], // up2 left1
    [-1, -2], // up1 left2
    [1, -2], // down1 left2
    [2, -1], // down2 left1
];

export function calculatePossibleMovesForPiece(piece: Piece, currIndex: number, board: ChessBoardType): number[] {
    const { row, col } = indexToRowCol(currIndex);
    const { type: pieceType, color } = piece;

    let possibleMoveIndices: number[] = [];
    if (pieceType === 'pawn') {
        const potentialRows = color === 'white' ? [row - 1, row - 2] : [row + 1, row + 2];
        for (const currRow of potentialRows) {
            if (currRow < 0 && currRow >= NUM_ROWS) continue;
            const index = rowColToIndex({ row: currRow, col });
            if (board[index] !== undefined) break;
            possibleMoveIndices.push(index);
        }
    } else if (['bishop', 'rook', 'queen'].includes(pieceType)) {
        let deltas: RowColDeltas = [];
        if (['bishop', 'queen'].includes(pieceType)) {
            deltas = [...deltas, ...DIAGONAL_DELTAS];
        }
        if (['rook', 'queen'].includes(pieceType)) {
            deltas = [...deltas, ...STRAIGHT_DELTAS];
        }

        for (const [rowDelta, colDelta] of deltas) {
            let nextRow = row + rowDelta;
            let nextCol = col + colDelta;
            while (nextRow >= 0 && nextRow < NUM_ROWS && nextCol >= 0 && nextCol < NUM_COLS) {
                const index = rowColToIndex({ row: nextRow, col: nextCol });
                if (index < 0) break;
                if (board[index] !== undefined) break;
                possibleMoveIndices.push(index);
                nextRow += rowDelta;
                nextCol += colDelta;
            }
        }
    } else if (pieceType === 'king') {
        const deltas: RowColDeltas = [...DIAGONAL_DELTAS, ...STRAIGHT_DELTAS];
        for (const [rowDelta, colDelta] of deltas) {
            const nextRow = row + rowDelta;
            const nextCol = col + colDelta;
            if (nextRow < 0 || nextRow >= NUM_ROWS || nextCol < 0 || nextCol >= NUM_COLS) continue;
            const index = rowColToIndex({ row: nextRow, col: nextCol });
            if (index < 0) continue;
            if (board[index] === undefined) {
                possibleMoveIndices.push(index);
            }
        }
    } else if (pieceType === 'knight') {
        for (const [rowDelta, colDelta] of KNIGHT_DELTAS) {
            const nextRow = row + rowDelta;
            const nextCol = col + colDelta;
            if (nextRow < 0 || nextRow >= NUM_ROWS || nextCol < 0 || nextCol >= NUM_COLS) continue;
            const index = rowColToIndex({ row: nextRow, col: nextCol });
            if (index < 0) continue;
            if (board[index] === undefined) {
                possibleMoveIndices.push(index);
            }
        }
    }

    return possibleMoveIndices;
}
