import { ChessClockService } from './chessClockService.js';
import { ChessGameService } from './chessGameService.js';
import { GameRoomService } from './gameRoomService.js';
import { PlayerService } from './playerService.js';

// Single instances shared across the application
export const chessClockService = new ChessClockService();
export const chessGameService = new ChessGameService();
export const gameRoomService = new GameRoomService();
export const playerService = new PlayerService();

export { ChessClockService, ChessGameService, GameRoomService, PlayerService };
