import * as Sentry from '@sentry/react';
import type { FallbackProps } from 'react-error-boundary';

import { aliasToPieceImageData } from '../../utils/pieces';

/**
 * Fallback view to show when an uncaught error occurs in the app.
 */
function AppErrorView({ error }: FallbackProps) {
    Sentry.captureException(error);

    const { imgSrc: rookImgSrc, altText: rookAltText } = aliasToPieceImageData['R'];

    return (
        <main className="min-h-dvh font-serif bg-zinc-900 text-zinc-100">
            <div className="mx-auto flex max-w-7xl flex-col px-6 gap-6 sm:py-8">
                <header className="text-center sm:text-left">
                    <a href="/">
                        <h1 className="flex items-center text-4xl font-display font-bold tracking-tight text-white sm:text-5xl">
                            <img src={rookImgSrc} alt={rookAltText} className="inline-block size-16" />
                            grouchess
                        </h1>
                    </a>
                    <p className="mt-2 text-base text-zinc-400 sm:max-w-xl sm:text-lg">
                        grouchess is a Lichess-clone project just for fun and learning
                    </p>
                </header>

                <div className="flex-1 flex items-center">
                    <section className="flex w-full max-w-3xl flex-col items-center gap-4 rounded-3xl border border-red-800/60 bg-red-950/40 pb-18 px-18 text-center shadow-2xl shadow-black/30">
                        <img
                            src="/gifs/gatito_dar_vueltasx3.gif"
                            alt="Cat walking in a circle"
                            className="size-64 select-none"
                        />

                        <div className="flex flex-row gap-2">
                            <img
                                src="/images/tower-fall.svg"
                                className="size-8 text-white"
                                alt="Tower fall illustration"
                            />
                            <h2 className="text-xl font-semibold pr-3 text-red-200 sm:text-2xl">Uh oh!</h2>
                        </div>

                        <p className="text-sm text-red-300">Something went terribly wrong. Please try again later.</p>
                    </section>
                </div>
            </div>
        </main>
    );
}

export default AppErrorView;
