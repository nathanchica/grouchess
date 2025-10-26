import { useState } from 'react';

import { Routes, Route, useNavigate } from 'react-router';

import { useImages } from '../../providers/ImagesProvider';
import { aliasToPieceImageData } from '../../utils/pieces';
import type { WaitingRoom } from '../../utils/types';
import GameRoomForm from '../mainmenu/GameRoomForm';
import WaitingRoomView from '../mainmenu/WaitingRoomView';

/**
 * Main menu view component.
 *
 * If a roomId is present in the URL path, shows the WaitingRoomView for that room.
 * Otherwise, shows the GameRoomForm to create a new room.
 */
function MainMenuView() {
    const { imgSrcMap } = useImages();
    const navigate = useNavigate();
    const [waitingRoomProps, setWaitingRoomProps] = useState<WaitingRoom | null>(null);

    const { imgSrc: rookImgSrc, altText: rookAltText } = aliasToPieceImageData['R'];
    const logoImgSrc = imgSrcMap[rookImgSrc] ?? rookImgSrc;

    const onRoomCreated = (newWaitingRoom: WaitingRoom) => {
        setWaitingRoomProps(newWaitingRoom);
        const key = `token:${newWaitingRoom.roomId}`;
        sessionStorage.setItem(key, JSON.stringify(newWaitingRoom));
        navigate(`/${newWaitingRoom.roomId}`);
    };

    return (
        <main className="min-h-dvh font-serif bg-zinc-900 text-zinc-100">
            <div className="mx-auto flex max-w-7xl flex-col px-6 gap-6 sm:py-8">
                <header className="text-center sm:text-left">
                    <a href="/">
                        <h1 className="flex items-center text-4xl font-display font-bold tracking-tight text-white sm:text-5xl">
                            <img src={logoImgSrc} alt={rookAltText} className="inline-block size-16" />
                            Grouchess
                        </h1>
                    </a>
                    <p className="mt-2 text-base text-zinc-400 sm:max-w-xl sm:text-lg">
                        Grouchess is a Lichess-clone project just for fun and learning
                    </p>
                </header>

                <Routes>
                    <Route
                        path="/:roomId"
                        element={
                            <WaitingRoomView
                                roomToken={waitingRoomProps?.token}
                                isCreator={Boolean(waitingRoomProps?.isCreator)}
                            />
                        }
                    />
                    <Route path="/" element={<GameRoomForm onRoomCreated={onRoomCreated} />} />
                </Routes>
            </div>
        </main>
    );
}

export default MainMenuView;
