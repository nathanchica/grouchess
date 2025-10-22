import { GameRoomService } from './gameRoomService.js';
import { PlayerService } from './playerService.js';

// Single instances shared across the application
export const gameRoomService = new GameRoomService();
export const playerService = new PlayerService();

export { GameRoomService, PlayerService };
