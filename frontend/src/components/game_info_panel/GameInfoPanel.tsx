import { useState } from 'react';

import ExitGameRoomModal from './ExitGameRoomModal';
import LoadBoardModal from './LoadBoardModal';
import MoveHistoryTable from './MoveHistoryTable';
import ShareBoardStateModal from './ShareBoardStateModal';


import ArrowRightFromBracketIcon from '../../assets/icons/arrow-right-from-bracket.svg?react';
import FileImportIcon from '../../assets/icons/file-import.svg?react';
import GearIcon from '../../assets/icons/gear.svg?react';
import RotateLeftIcon from '../../assets/icons/rotate-left.svg?react';
import ShareNodesIcon from '../../assets/icons/share-nodes.svg?react';
import { useChessGame } from '../../providers/ChessGameProvider';
import { useGameRoom } from '../../providers/GameRoomProvider';
import InfoCard from '../InfoCard';
import SoundControls from '../SoundControls';
import IconButton, { type IconButtonProps } from '../common/IconButton';

const ICON_CLASSES = 'w-4 h-4 2xl:w-5 2xl:h-5';

type Views = 'history' | 'settings';
type IconButtonPropsWithKey = IconButtonProps & { key: string };

function GameInfoPanel() {
    const { room, incrementGameCount } = useGameRoom();
    const { resetGame } = useChessGame();

    const [shareModalIsShowing, setShareModalIsShowing] = useState(false);
    const [loadBoardModalIsShowing, setLoadBoardModalIsShowing] = useState(false);
    const [exitModalIsShowing, setExitModalIsShowing] = useState(false);
    const [currentView, setCurrentView] = useState<Views>('history');

    if (!room) return null;
    const { players, playerIdToScore, type } = room;

    const onShareModalDismiss = () => {
        setShareModalIsShowing(false);
    };

    const onLoadBoardModalDismiss = () => {
        setLoadBoardModalIsShowing(false);
    };

    const onExitModalDismiss = () => {
        setExitModalIsShowing(false);
    };

    const onResetButtonClick = () => {
        resetGame();
        incrementGameCount();
    };

    let headerText = '';
    let scoreText = '';
    if (type === 'self') {
        headerText = 'Freeplay';
    } else {
        const [player1, player2] = players;
        headerText = `${player1.displayName} vs. ${player2.displayName}`;
        scoreText = `${playerIdToScore[player1.id]}-${playerIdToScore[player2.id]}`;
    }

    const iconButtons: IconButtonPropsWithKey[] = [
        {
            key: 'reset-game-button',
            icon: <RotateLeftIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: onResetButtonClick,
            ariaProps: {
                'aria-label': 'Reset game',
            },
            tooltipText: 'Reset game',
        },
        {
            key: 'load-board-button',
            icon: <FileImportIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => setLoadBoardModalIsShowing(true),
            ariaProps: {
                'aria-label': 'Load Board',
                'aria-haspopup': 'dialog',
                'aria-controls': loadBoardModalIsShowing ? 'load-fen-modal' : undefined,
            },
            tooltipText: 'Load Board',
        },
        {
            key: 'settings-button',
            icon: <GearIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => setCurrentView((prev) => (prev === 'settings' ? 'history' : 'settings')),
            ariaProps: {
                'aria-label': 'Settings',
            },
            tooltipText: 'Settings',
            isActive: currentView === 'settings',
        },
        {
            key: 'share-button',
            icon: <ShareNodesIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => setShareModalIsShowing(true),
            ariaProps: {
                'aria-label': 'Share',
                'aria-haspopup': 'dialog',
                'aria-controls': shareModalIsShowing ? 'share-board-modal' : undefined,
            },
            tooltipText: 'Share',
        },
        {
            key: 'exit-game-room-button',
            icon: <ArrowRightFromBracketIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => setExitModalIsShowing(true),
            ariaProps: {
                'aria-label': 'Exit Game',
                'aria-haspopup': 'dialog',
                'aria-controls': exitModalIsShowing ? 'exit-game-room-modal' : undefined,
            },
            tooltipText: 'Exit Game',
        },
    ];

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

                    <section className="flex justify-between" aria-label="Game actions">
                        {iconButtons.map(({ key, icon, onClick, ariaProps, isActive, tooltipText }) => (
                            <IconButton
                                key={key}
                                icon={icon}
                                onClick={onClick}
                                ariaProps={ariaProps}
                                isActive={isActive}
                                tooltipText={tooltipText}
                            />
                        ))}
                    </section>
                </div>
            </InfoCard>

            {shareModalIsShowing && <ShareBoardStateModal onDismiss={onShareModalDismiss} />}
            {loadBoardModalIsShowing && <LoadBoardModal onDismiss={onLoadBoardModalDismiss} />}
            {exitModalIsShowing && <ExitGameRoomModal onDismiss={onExitModalDismiss} />}
        </>
    );
}

export default GameInfoPanel;
