import { ChessClockService } from './chessClockService.js';
import { ChessGameService } from './chessGameService.js';
import { GameRoomService } from './gameRoomService.js';
import { PlayerService } from './playerService.js';
import { JwtTokenService } from './tokenService.js';

import { getEnv } from '../config.js';

const env = getEnv();

// Single instances shared across the application
export const chessClockService = new ChessClockService();
export const chessGameService = new ChessGameService();
export const gameRoomService = new GameRoomService();
export const playerService = new PlayerService();
export const tokenService = new JwtTokenService(env.JWT_SECRET);

export { ChessClockService, ChessGameService, GameRoomService, PlayerService, JwtTokenService };
