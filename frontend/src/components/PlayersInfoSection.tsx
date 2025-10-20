import PlayerCard from './PlayerCard';

import { useGameRoom } from '../providers/GameRoomProvider';

type Variant = 'row' | 'col';

type Props = {
    variant: Variant;
};

function PlayersInfoSection({ variant }: Props) {
    const { room } = useGameRoom();

    if (!room) return null;
    const { playerIdToDisplayName, colorToPlayerId } = room;
    const { white: whitePlayerId, black: blackPlayerId } = colorToPlayerId;
    const blackCard = <PlayerCard color="black" displayName={playerIdToDisplayName[blackPlayerId]} />;
    const whiteCard = <PlayerCard color="white" displayName={playerIdToDisplayName[whitePlayerId]} />;

    return variant === 'col' ? (
        <div className="flex flex-col justify-between gap-8 h-full">
            {blackCard}
            {whiteCard}
        </div>
    ) : (
        <div className="flex flex-row justify-between gap-2 px-4">
            {whiteCard}
            {blackCard}
        </div>
    );
}

export default PlayersInfoSection;
