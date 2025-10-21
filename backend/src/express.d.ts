import type { GameRoomService } from './services/gameRoomService.ts';
import type { PlayerService } from './services/playerService.ts';

declare global {
    namespace Express {
        interface Request {
            services: {
                playerService: PlayerService;
                gameRoomService: GameRoomService;
            };
        }
    }
}

export {};
