import type { ChessClockService, ChessGameService, GameRoomService, PlayerService } from './services/index.ts';

declare global {
    namespace Express {
        interface Request {
            services: {
                chessClockService: ChessClockService;
                chessGameService: ChessGameService;
                playerService: PlayerService;
                gameRoomService: GameRoomService;
            };
            // Authentication data (populated by authenticateRequest middleware)
            playerId?: string;
            roomId?: string;
        }
    }
}

export {};
