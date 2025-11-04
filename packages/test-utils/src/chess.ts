import type {
    BoardIndex,
    CastleRights,
    CastleRightsByColor,
    ChessBoardState,
    ChessBoardType,
    ChessGame,
    ChessGameState,
    LegalMovesStore,
    Move,
    MoveNotation,
    MoveRecord,
    Piece,
    PieceCapture,
    PositionCounts,
    RowCol,
} from '@grouchess/models';

/**
 * Creates a mock BoardIndex (0-63)
 */
export function createMockBoardIndex(value: number = 0): BoardIndex {
    return Math.min(Math.max(0, value), 63) as BoardIndex;
}

/**
 * Creates a mock RowCol coordinate
 */
export function createMockRowCol(overrides?: Partial<RowCol>): RowCol {
    return {
        row: 0,
        col: 0,
        ...overrides,
    };
}

/**
 * Creates a mock Piece
 */
export function createMockPiece(overrides?: Partial<Piece>): Piece {
    return {
        alias: 'P',
        color: 'white',
        type: 'pawn',
        value: 1,
        ...overrides,
    };
}

/**
 * Creates mock CastleRights
 */
export function createMockCastleRights(overrides?: Partial<CastleRights>): CastleRights {
    return {
        short: true,
        long: true,
        ...overrides,
    };
}

/**
 * Creates mock CastleRightsByColor
 */
export function createMockCastleRightsByColor(overrides?: Partial<CastleRightsByColor>): CastleRightsByColor {
    return {
        white: createMockCastleRights(),
        black: createMockCastleRights(),
        ...overrides,
    };
}

/**
 * Creates a mock ChessBoard (empty by default)
 * @param overrides - A record of board indices to piece aliases (e.g., { 0: 'R', 7: 'K' })
 */
export function createMockChessBoard(overrides?: Record<number, ChessBoardType[number]>): ChessBoardType {
    const emptyBoard = Array(64).fill(null);
    if (!overrides) {
        return emptyBoard as ChessBoardType;
    }
    return emptyBoard.map((_, index) => overrides[index] ?? null) as ChessBoardType;
}

/**
 * Creates a mock ChessBoard with starting position
 */
export function createMockStartingChessBoard(): ChessBoardType {
    // prettier-ignore
    return [
        'r', 'n', 'b', 'q', 'k', 'b', 'n', 'r', // Black back rank
        'p', 'p', 'p', 'p', 'p', 'p', 'p', 'p', // Black pawns
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        null, null, null, null, null, null, null, null,
        'P', 'P', 'P', 'P', 'P', 'P', 'P', 'P', // White pawns
        'R', 'N', 'B', 'Q', 'K', 'B', 'N', 'R', // White back rank
    ] as ChessBoardType;
}

/**
 * Creates a mock ChessBoardState
 */
export function createMockChessBoardState(overrides?: Partial<ChessBoardState>): ChessBoardState {
    return {
        board: createMockChessBoard(),
        playerTurn: 'white',
        castleRightsByColor: createMockCastleRightsByColor(),
        enPassantTargetIndex: null,
        halfmoveClock: 0,
        fullmoveClock: 1,
        ...overrides,
    };
}

/**
 * Creates a mock ChessBoardState with starting position
 */
export function createMockStartingChessBoardState(overrides?: Partial<ChessBoardState>): ChessBoardState {
    return {
        board: createMockStartingChessBoard(),
        playerTurn: 'white',
        castleRightsByColor: createMockCastleRightsByColor(),
        enPassantTargetIndex: null,
        halfmoveClock: 0,
        fullmoveClock: 1,
        ...overrides,
    };
}

/**
 * Creates a mock Move
 */
export function createMockMove(overrides?: Partial<Move>): Move {
    return {
        startIndex: 52 as BoardIndex, // e2
        endIndex: 36 as BoardIndex, // e4
        type: 'standard',
        piece: createMockPiece(),
        ...overrides,
    };
}

/**
 * Creates a mock MoveNotation
 */
export function createMockMoveNotation(overrides?: Partial<MoveNotation>): MoveNotation {
    return {
        san: 'Nf3',
        figurine: '\u265Ef3',
        uci: 'g1f3',
        ...overrides,
    };
}

/**
 * Creates a mock MoveRecord
 */
export function createMockMoveRecord(overrides?: Partial<MoveRecord>): MoveRecord {
    return {
        move: createMockMove(),
        notation: createMockMoveNotation(),
        ...overrides,
    };
}

/**
 * Creates a mock LegalMovesStore
 */
export function createMockLegalMovesStore(overrides?: Partial<LegalMovesStore>): LegalMovesStore {
    return {
        allMoves: [],
        byStartIndex: {},
        typeAndEndIndexToStartIndex: {},
        ...overrides,
    };
}

/**
 * Creates a mock ChessGameState
 */
export function createMockChessGameState(overrides?: Partial<ChessGameState>): ChessGameState {
    return {
        status: 'in-progress',
        ...overrides,
    };
}

/**
 * Creates a mock PieceCapture
 */
export function createMockPieceCapture(overrides?: Partial<PieceCapture>): PieceCapture {
    return {
        piece: createMockPiece({ alias: 'p', color: 'black', type: 'pawn', value: 1 }),
        moveIndex: 0,
        ...overrides,
    };
}

/**
 * Creates mock PositionCounts
 */
export function createMockPositionCounts(overrides?: PositionCounts): PositionCounts {
    return overrides ?? {};
}

/**
 * Creates a mock ChessGame
 */
export function createMockChessGame(overrides?: Partial<ChessGame>): ChessGame {
    return {
        boardState: createMockChessBoardState(),
        gameState: createMockChessGameState(),
        legalMovesStore: createMockLegalMovesStore(),
        moveHistory: [],
        captures: [],
        positionCounts: {},
        ...overrides,
    };
}

/**
 * Creates a mock ChessGame with starting position
 */
export function createMockStartingChessGame(overrides?: Partial<ChessGame>): ChessGame {
    return {
        boardState: createMockStartingChessBoardState(),
        gameState: createMockChessGameState(),
        legalMovesStore: createMockLegalMovesStore(),
        moveHistory: [],
        captures: [],
        positionCounts: {},
        ...overrides,
    };
}
