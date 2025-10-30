import type { ChessClockState, EndGameReason, Move, PawnPromotion } from '@grouchess/chess';
import type { ChessGameRoom, Message, Player, TimeControl } from '@grouchess/game-room';

import type { ChessGameUI } from '../../utils/types';

export type ChessGameRoomState = {
    chessGame: ChessGameUI;
    gameRoom: ChessGameRoom;
    clockState: ChessClockState | null;
    currentPlayerId: Player['id'];
};

export type Action =
    | { type: 'move-piece'; move: Move }
    | { type: 'promote-pawn'; pawnPromotion: PawnPromotion }
    | { type: 'cancel-promotion' }
    | { type: 'load-fen'; fenString: string }
    | { type: 'end-game'; reason: EndGameReason; winner?: ChessGameUI['gameState']['winner'] }
    | { type: 'start-self-play-room'; timeControlOption: TimeControl | null }
    | { type: 'load-room'; gameRoom: ChessGameRoom; fen?: string }
    | { type: 'add-message'; message: Message }
    | { type: 'load-current-player-id'; playerId: Player['id'] }
    | { type: 'set-clocks'; clockState: ChessClockState | null }
    | { type: 'reset-clocks' };
