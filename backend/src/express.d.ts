import type { ChessGameService, GameRoomService, PlayerService } from './services/index.ts';

declare global {
    namespace Express {
        interface Request {
            services: {
                chessGameService: ChessGameService;
                playerService: PlayerService;
                gameRoomService: GameRoomService;
            };
        }
    }
}

export {};
