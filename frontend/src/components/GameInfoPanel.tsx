import { useState } from 'react';

import ExitGameRoomModal from './ExitGameRoomModal';
import InfoCard from './InfoCard';
import LoadFENModal from './LoadFENModal';
import MoveHistoryTable from './MoveHistoryTable';
import ResetButton from './ResetButton';
import ShareBoardStateModal from './ShareBoardStateModal';
import SoundControls from './SoundControls';
import TooltipContainer from './TooltipContainer';

import ArrowRightFromBracketIcon from '../assets/icons/arrow-right-from-bracket.svg?react';
import FileImportIcon from '../assets/icons/file-import.svg?react';
import GearIcon from '../assets/icons/gear.svg?react';
import ShareNodesIcon from '../assets/icons/share-nodes.svg?react';
import { useGameRoom } from '../providers/GameRoomProvider';

type Views = 'history' | 'settings';

function GameInfoPanel() {
    const { room } = useGameRoom();

    const [shareModalIsShowing, setShareModalIsShowing] = useState(false);
    const [loadFenModalIsShowing, setLoadFenModalIsShowing] = useState(false);
    const [exitModalIsShowing, setExitModalIsShowing] = useState(false);
    const [currentView, setCurrentView] = useState<Views>('history');

    const onShareModalDismiss = () => {
        setShareModalIsShowing(false);
    };

    const onLoadFenModalDismiss = () => {
        setLoadFenModalIsShowing(false);
    };

    const onExitModalDismiss = () => {
        setExitModalIsShowing(false);
    };

    if (!room) return null;
    const { players, playerIdToScore, type } = room;

    let headerText = '';
    let scoreText = '';
    if (type === 'self') {
        headerText = 'Freeplay';
    } else {
        const [player1, player2] = players;
        headerText = `${player1.displayName} vs. ${player2.displayName}`;
        scoreText = `${playerIdToScore[player1.id]}-${playerIdToScore[player2.id]}`;
    }

    return (
        <>
            <InfoCard className="h-full">
                <div className="xl:px-6 xl:py-5 p-3 flex flex-col gap-4 h-full">
                    <section className="flex lg:flex-row flex-col gap-1 justify-between">
                        <span className="lg:text-lg text-sm text-zinc-100">{headerText}</span>
                        <span className="lg:text-base text-xs text-zinc-300 tracking-[0.2em] proportional-nums">
                            {scoreText}
                        </span>
                    </section>

                    {currentView === 'history' && <MoveHistoryTable />}
                    {currentView === 'settings' && (
                        <>
                            <SoundControls />
                            <div className="grow" />
                        </>
                    )}

                    <section className="flex justify-between gap-8" aria-label="Game actions">
                        <TooltipContainer tooltipText="Reset">
                            <ResetButton />
                        </TooltipContainer>

                        <TooltipContainer tooltipText="Load FEN">
                            <button
                                type="button"
                                onClick={() => setLoadFenModalIsShowing(true)}
                                aria-label="Load FEN"
                                aria-haspopup="dialog"
                                aria-controls={loadFenModalIsShowing ? 'load-fen-modal' : undefined}
                                className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            >
                                <FileImportIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </TooltipContainer>

                        <div className="grow" />

                        <TooltipContainer tooltipText="Settings">
                            <button
                                type="button"
                                onClick={() => setCurrentView((prev) => (prev === 'settings' ? 'history' : 'settings'))}
                                aria-label="Settings"
                                className={`${currentView === 'settings' ? 'text-zinc-100' : 'text-zinc-400'} cursor-pointer`}
                            >
                                <GearIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </TooltipContainer>

                        <TooltipContainer tooltipText="Share">
                            <button
                                type="button"
                                onClick={() => setShareModalIsShowing(true)}
                                aria-label="Share"
                                aria-haspopup="dialog"
                                aria-controls={shareModalIsShowing ? 'share-board-modal' : undefined}
                                className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            >
                                <ShareNodesIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </TooltipContainer>

                        <TooltipContainer tooltipText="Exit Game">
                            <button
                                type="button"
                                onClick={() => setExitModalIsShowing(true)}
                                aria-label="Exit Game"
                                aria-haspopup="dialog"
                                aria-controls={exitModalIsShowing ? 'exit-game-room-modal' : undefined}
                                className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            >
                                <ArrowRightFromBracketIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </TooltipContainer>
                    </section>
                </div>
            </InfoCard>

            {shareModalIsShowing && <ShareBoardStateModal onDismiss={onShareModalDismiss} />}
            {loadFenModalIsShowing && <LoadFENModal onDismiss={onLoadFenModalDismiss} />}
            {exitModalIsShowing && <ExitGameRoomModal onDismiss={onExitModalDismiss} />}
        </>
    );
}

export default GameInfoPanel;
