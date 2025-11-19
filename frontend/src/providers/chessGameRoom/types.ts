import type {
    ChessClockState,
    ChessGameRoom,
    ChessGameStatus,
    ChessGameMessage,
    Move,
    PawnPromotion,
    Player,
} from '@grouchess/models';

import type { ChessGameUI } from '../../utils/types';

export type ChessGameRoomState = {
    chessGame: ChessGameUI;
    gameRoom: ChessGameRoom;
    clockState: ChessClockState | null;
    messages: ChessGameMessage[];
    currentPlayerId: Player['id'];
};

export type EndGameInput = {
    reason: ChessGameStatus;
    winner?: ChessGameUI['gameState']['winner'];
    updatedScores?: ChessGameRoom['playerIdToScore'];
};

export type Action =
    | { type: 'move-piece'; move: Move }
    | { type: 'promote-pawn'; pawnPromotion: PawnPromotion }
    | { type: 'cancel-promotion' }
    | { type: 'load-fen'; fenString: string }
    | { type: 'end-game'; input: EndGameInput }
    | { type: 'add-message'; message: ChessGameMessage }
    | { type: 'set-clocks'; clockState: ChessClockState | null }
    | { type: 'reset-clocks' };
