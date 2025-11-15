import { Suspense, lazy } from 'react';

import type { TimeControl } from '@grouchess/models';
import { ErrorBoundary } from 'react-error-boundary';
import { Routes, Route } from 'react-router';

import { useImages } from '../../providers/ImagesProvider';
import { aliasToPieceImageData } from '../../utils/pieces';
import ErrorView from '../mainmenu/ErrorView';

const WaitingRoomView = lazy(() => import('../mainmenu/WaitingRoomView'));
const GameRoomFormHealthGate = lazy(() => import('../mainmenu/GameRoomFormHealthGate'));

export type MainMenuViewProps = {
    onSelfPlayStart: (timeControl: TimeControl | null) => void;
};

/**
 * Main menu view component.
 *
 * If a roomId is present in the URL path, shows the WaitingRoomView for that room.
 * Otherwise, shows the GameRoomForm to create a new room.
 */
function MainMenuView({ onSelfPlayStart }: MainMenuViewProps) {
    const { imgSrcMap } = useImages();

    const { imgSrc: rookImgSrc, altText: rookAltText } = aliasToPieceImageData['R'];
    const logoImgSrc = imgSrcMap[rookImgSrc] ?? rookImgSrc;

    return (
        <main className="min-h-dvh font-serif bg-zinc-900 text-zinc-100">
            <div className="mx-auto flex max-w-7xl flex-col px-6 gap-6 sm:py-8">
                <header className="text-center sm:text-left">
                    <a href="/">
                        <h1 className="flex items-center text-4xl font-display font-bold tracking-tight text-white sm:text-5xl">
                            <img src={logoImgSrc} alt={rookAltText} className="inline-block size-16" />
                            grouchess
                        </h1>
                    </a>
                    <p className="mt-2 text-base text-zinc-400 sm:max-w-xl sm:text-lg">
                        grouchess is a Lichess-clone project just for fun and learning
                    </p>
                </header>

                <ErrorBoundary fallbackRender={ErrorView}>
                    <Suspense fallback={null}>
                        <Routes>
                            <Route path="/:roomId" element={<WaitingRoomView />} />
                            <Route path="/" element={<GameRoomFormHealthGate onSelfPlayStart={onSelfPlayStart} />} />
                        </Routes>
                    </Suspense>
                </ErrorBoundary>
            </div>
        </main>
    );
}

export default MainMenuView;
