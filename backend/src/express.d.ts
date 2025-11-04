import type {
    ChessClockService,
    ChessGameService,
    GameRoomService,
    MessageService,
    PlayerService,
} from './services/index.ts';
import type { TokenService } from './services/tokenService.ts';

declare global {
    namespace Express {
        interface Request {
            services: {
                chessClockService: ChessClockService;
                chessGameService: ChessGameService;
                messageService: MessageService;
                playerService: PlayerService;
                gameRoomService: GameRoomService;
                tokenService: TokenService;
            };
            // Authentication data (populated by authenticateRequest middleware)
            playerId?: string;
            roomId?: string;
        }
    }
}

export {};
