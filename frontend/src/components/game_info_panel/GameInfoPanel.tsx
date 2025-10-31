import { useState } from 'react';

import invariant from 'tiny-invariant';

import ExitGameRoomModal from './ExitGameRoomModal';
import GameActions from './GameActions';
import LoadBoardModal from './LoadBoardModal';
import MoveHistoryTable from './MoveHistoryTable';
import PlayerScoreDisplay from './PlayerScoreDisplay';
import ShareBoardStateModal from './ShareBoardStateModal';
import SoundControls from './SoundControls';

import ArrowRightFromBracketIcon from '../../assets/icons/arrow-right-from-bracket.svg?react';
import FileImportIcon from '../../assets/icons/file-import.svg?react';
import GearIcon from '../../assets/icons/gear.svg?react';
import RotateLeftIcon from '../../assets/icons/rotate-left.svg?react';
import ShareNodesIcon from '../../assets/icons/share-nodes.svg?react';
import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';
import IconButton, { type IconButtonProps } from '../common/IconButton';
import InfoCard from '../common/InfoCard';

const ICON_CLASSES = 'w-4 h-4 2xl:w-5 2xl:h-5';

type Views = 'history' | 'settings';
type IconButtonPropsWithKey = IconButtonProps & { key: string; skip?: boolean };

function GameInfoPanel() {
    const { chessGame, loadFEN } = useChessGame();
    const { gameRoom, currentPlayerColor } = useGameRoom();
    invariant(gameRoom && chessGame, 'Game room and chess game are required');
    const { players, playerIdToScore, type } = gameRoom;
    const { timelineVersion, moveHistory } = chessGame;
    const [player1, player2] = players;

    const [shareModalIsShowing, setShareModalIsShowing] = useState(false);
    const [loadBoardModalIsShowing, setLoadBoardModalIsShowing] = useState(false);
    const [exitModalIsShowing, setExitModalIsShowing] = useState(false);
    const [currentView, setCurrentView] = useState<Views>('history');

    const showExitModal = () => {
        setExitModalIsShowing(true);
    };

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
        loadFEN();
    };

    const iconButtons: IconButtonPropsWithKey[] = [
        {
            key: 'reset-game-button',
            skip: type !== 'self',
            icon: <RotateLeftIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: onResetButtonClick,
            ariaProps: {
                'aria-label': 'Reset game',
            },
            tooltipText: 'Reset game',
        },
        {
            key: 'load-board-button',
            skip: type !== 'self',
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
            onClick: showExitModal,
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
                <div className="xl:px-6 xl:py-5 p-3 flex flex-col 2xl:gap-8 gap-4 h-full">
                    {type === 'self' ? (
                        <section className="text-zinc-100">Self Play</section>
                    ) : (
                        <section className="text-zinc-100">
                            <PlayerScoreDisplay name={player1.displayName} score={playerIdToScore[player1.id]} /> -{' '}
                            <PlayerScoreDisplay name={player2.displayName} score={playerIdToScore[player2.id]} />
                        </section>
                    )}

                    {currentView === 'history' && (
                        <MoveHistoryTable key={`move-history-table-${timelineVersion}`} onExitClick={showExitModal} />
                    )}
                    {currentView === 'settings' && (
                        <>
                            <SoundControls />
                            <div className="grow" />
                        </>
                    )}

                    {type !== 'self' && (
                        <GameActions
                            // Reset the component each turn or each game to reset internal states
                            key={`game-actions-${timelineVersion}-${moveHistory.length}`}
                            playerColor={currentPlayerColor}
                        />
                    )}

                    <section
                        className={`flex ${type === 'self' ? 'justify-between' : 'justify-evenly'}`}
                        aria-label="Game actions"
                    >
                        {iconButtons.map(({ key, skip, icon, onClick, ariaProps, isActive, tooltipText }) =>
                            !skip ? (
                                <IconButton
                                    key={key}
                                    icon={icon}
                                    onClick={onClick}
                                    ariaProps={ariaProps}
                                    isActive={isActive}
                                    tooltipText={tooltipText}
                                />
                            ) : null
                        )}
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
