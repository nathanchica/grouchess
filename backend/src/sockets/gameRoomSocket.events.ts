import { AuthenticatedPayloadSchema, ErrorPayloadSchema } from './gameRoomSocket.schemas.js';

import type { AuthenticatedSocket } from '../middleware/authenticateSocket.js';

export function sendErrorEvent(socket: AuthenticatedSocket, message: string) {
    socket.emit('error', ErrorPayloadSchema.parse({ message }));
}

export function sendAuthenticatedEvent(socket: AuthenticatedSocket, success: boolean) {
    socket.emit('authenticated', AuthenticatedPayloadSchema.parse({ success }));
}
