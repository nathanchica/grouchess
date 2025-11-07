import { useNavigate } from 'react-router';

import { getLocationOrigin } from '../../utils/window';
import CopyableTextField from '../common/CopyableTextField';

type Props = {
    roomId: string;
};

function CreatorWaitingRoom({ roomId }: Props) {
    const navigate = useNavigate();

    const shareUrl = `${getLocationOrigin()}/${roomId}`;

    return (
        <div className="flex flex-col gap-8">
            <h2 className="text-2xl font-bold text-zinc-100 sm:text-3xl mb-2">Game Created!</h2>

            <CopyableTextField
                text={shareUrl}
                label="Share this link to invite a friend to play"
                id="share-url"
                copyButtonAriaLabel="Copy share URL"
            />

            <div className="flex flex-col items-center gap-4 py-6">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
                    <p className="text-zinc-300 font-medium">Waiting for opponent to join...</p>
                </div>
                <p className="text-zinc-500 text-sm">The game will start automatically when someone joins</p>
            </div>

            <button
                type="button"
                className="rounded-lg cursor-pointer px-6 py-2.5 font-semibold text-white hover:border-red-600/80 transition-colors border border-red-400/40"
                onClick={() => {
                    navigate('/');
                }}
            >
                Cancel Game
            </button>
        </div>
    );
}

export default CreatorWaitingRoom;
