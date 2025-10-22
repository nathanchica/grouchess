import type { GameRoomService, PlayerService } from './services/index.ts';

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
