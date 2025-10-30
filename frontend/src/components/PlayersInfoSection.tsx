import invariant from 'tiny-invariant';

import PlayerCard from './PlayerCard';
import PlayerChatPanel from './chat/PlayerChatPanel';

import { useGameRoom } from '../providers/ChessGameRoomProvider';

type Variant = 'row' | 'col';

type Props = {
    variant: Variant;
};

function PlayersInfoSection({ variant }: Props) {
    const { gameRoom, currentPlayerId } = useGameRoom();

    const { playerIdToDisplayName, colorToPlayerId, type: roomType } = gameRoom;
    const { white: whitePlayerId, black: blackPlayerId } = colorToPlayerId;
    invariant(whitePlayerId && blackPlayerId, 'Both players must be present to display PlayersInfoSection');

    const blackCard = <PlayerCard color="black" displayName={playerIdToDisplayName[blackPlayerId]} />;
    const whiteCard = <PlayerCard color="white" displayName={playerIdToDisplayName[whitePlayerId]} />;

    const isCurrentPlayerWhite = currentPlayerId === whitePlayerId;
    const currentPlayerCard = isCurrentPlayerWhite ? whiteCard : blackCard;
    const otherPlayerCard = isCurrentPlayerWhite ? blackCard : whiteCard;

    const playerChatPanel = roomType !== 'self' ? <PlayerChatPanel currentPlayerId={currentPlayerId} /> : null;

    return variant === 'col' ? (
        <div className="flex flex-col gap-4 h-full">
            {otherPlayerCard}
            <div className="flex-1 min-h-0">{playerChatPanel}</div>
            {currentPlayerCard}
        </div>
    ) : (
        <div className="flex flex-col gap-4 px-4">
            <div className="flex flex-row justify-between gap-2">
                {currentPlayerCard}
                {otherPlayerCard}
            </div>
            <div className="flex-1 min-h-0 pb-8">{playerChatPanel}</div>
        </div>
    );
}

export default PlayersInfoSection;
