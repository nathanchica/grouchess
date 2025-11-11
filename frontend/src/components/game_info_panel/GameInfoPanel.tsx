import { useState } from 'react';

import BottomDrawer from './BottomDrawer';
import GameActions from './GameActions';
import MoveHistoryTable from './MoveHistoryTable';
import ExitGameView from './bottom_drawer_views/ExitGameView';
import LoadBoardView from './bottom_drawer_views/LoadBoardView';
import PlayerSettingsView from './bottom_drawer_views/PlayerSettingsView';
import ShareBoardView from './bottom_drawer_views/ShareBoardView';

import ArrowRightFromBracketIcon from '../../assets/icons/arrow-right-from-bracket.svg?react';
import FileImportIcon from '../../assets/icons/file-import.svg?react';
import GearIcon from '../../assets/icons/gear.svg?react';
import RotateLeftIcon from '../../assets/icons/rotate-left.svg?react';
import ShareNodesIcon from '../../assets/icons/share-nodes.svg?react';
import { useChessGame, useGameRoom } from '../../providers/ChessGameRoomProvider';
import { useImages } from '../../providers/ImagesProvider';
import { aliasToPieceImageData } from '../../utils/pieces';
import IconButton, { type IconButtonProps } from '../common/IconButton';
import InfoCard from '../common/InfoCard';

const ICON_CLASSES = 'size-4 2xl:size-5';

type IconButtonPropsWithKey = IconButtonProps & { key: string; skip?: boolean };

export type BottomDrawerView = 'settings' | 'exit-game' | 'load-board' | 'share-board';
export const bottomDrawerViewAriaLabels: Record<BottomDrawerView, string> = {
    settings: 'Player Settings',
    'exit-game': 'Exit Game',
    'load-board': 'Load Board',
    'share-board': 'Share Board',
};

function GameInfoPanel() {
    const { isReady: isImagesLoaded, imgSrcMap } = useImages();
    const { chessGame, loadFEN } = useChessGame();
    const { gameRoom, currentPlayerColor } = useGameRoom();
    const { timelineVersion, moveHistory } = chessGame;
    const { type } = gameRoom;
    const isSelfPlay = type === 'self';

    const { imgSrc: rookImgSrc, altText: rookAltText } = aliasToPieceImageData['R'];
    const logoImgSrc = imgSrcMap[rookImgSrc] ?? rookImgSrc;

    const [activeBottomDrawerView, setActiveBottomDrawerView] = useState<BottomDrawerView | null>(null);
    const [bottomDrawerIsClosing, setBottomDrawerIsClosing] = useState(false);

    const onResetButtonClick = () => {
        loadFEN();
    };

    const startClosingBottomDrawer = () => {
        setBottomDrawerIsClosing(true);
    };

    const dismissBottomDrawer = () => {
        setActiveBottomDrawerView(null);
        setBottomDrawerIsClosing(false);
    };

    const toggleBottomDrawerView = (view: BottomDrawerView) => {
        if (activeBottomDrawerView === view) {
            startClosingBottomDrawer();
        } else {
            setActiveBottomDrawerView(view);
            setBottomDrawerIsClosing(false);
        }
    };

    const iconButtons: IconButtonPropsWithKey[] = [
        {
            key: 'reset-game-button',
            skip: !isSelfPlay,
            icon: <RotateLeftIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: onResetButtonClick,
            ariaProps: {
                'aria-label': 'Reset game',
            },
            tooltipText: 'Reset game',
        },
        {
            key: 'load-board-button',
            skip: !isSelfPlay,
            icon: <FileImportIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => toggleBottomDrawerView('load-board'),
            ariaProps: {
                'aria-label': 'Load Board',
                'aria-expanded': activeBottomDrawerView === 'load-board',
                'aria-controls': 'bottom-drawer',
            },
            tooltipText: 'Load Board',
            isActive: activeBottomDrawerView === 'load-board',
        },
        {
            key: 'settings-button',
            icon: <GearIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => toggleBottomDrawerView('settings'),
            ariaProps: {
                'aria-label': 'Settings',
                'aria-expanded': activeBottomDrawerView === 'settings',
                'aria-controls': 'bottom-drawer',
            },
            tooltipText: 'Settings',
            isActive: activeBottomDrawerView === 'settings',
        },
        {
            key: 'share-button',
            icon: <ShareNodesIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => toggleBottomDrawerView('share-board'),
            ariaProps: {
                'aria-label': 'Share',
                'aria-expanded': activeBottomDrawerView === 'share-board',
                'aria-controls': 'bottom-drawer',
            },
            tooltipText: 'Share',
            isActive: activeBottomDrawerView === 'share-board',
        },
        {
            key: 'exit-game-room-button',
            icon: <ArrowRightFromBracketIcon className={ICON_CLASSES} aria-hidden="true" />,
            onClick: () => toggleBottomDrawerView('exit-game'),
            ariaProps: {
                'aria-label': 'Exit Game',
                'aria-expanded': activeBottomDrawerView === 'exit-game',
                'aria-controls': 'bottom-drawer',
            },
            tooltipText: 'Exit Game',
            isActive: activeBottomDrawerView === 'exit-game',
        },
    ];

    return (
        <InfoCard className="h-full">
            <div className="2xl:py-5 p-2 flex flex-col 2xl:gap-4 gap-2 h-full">
                <div className="flex flex-row justify-center items-center gap-2 cursor-default">
                    {isImagesLoaded && <img src={logoImgSrc} alt={rookAltText} className="2xl:size-9 size-7" />}
                    <span className="text-zinc-100 font-display text-center pr-3 2xl:text-2xl text-lg font-bold">
                        grouchess
                    </span>
                </div>

                <section className="flex-1 flex flex-col min-h-0 bg-zinc-900/60 rounded-md overflow-hidden relative">
                    <div className="flex-1 overflow-y-auto overflow-x-hidden">
                        <MoveHistoryTable
                            key={`move-history-table-${timelineVersion}`}
                            onExitClick={() => toggleBottomDrawerView('exit-game')}
                        />
                    </div>

                    {activeBottomDrawerView != null && (
                        <BottomDrawer
                            onClosingEnd={dismissBottomDrawer}
                            onStartClosing={startClosingBottomDrawer}
                            shouldClose={bottomDrawerIsClosing}
                            ariaLabel={bottomDrawerViewAriaLabels[activeBottomDrawerView]}
                        >
                            {activeBottomDrawerView === 'settings' && <PlayerSettingsView />}
                            {activeBottomDrawerView === 'load-board' && (
                                <LoadBoardView onDismiss={startClosingBottomDrawer} />
                            )}
                            {activeBottomDrawerView === 'exit-game' && (
                                <ExitGameView onDismiss={startClosingBottomDrawer} />
                            )}
                            {activeBottomDrawerView === 'share-board' && <ShareBoardView />}
                        </BottomDrawer>
                    )}
                </section>

                {type !== 'self' && (
                    <section>
                        <GameActions
                            // Reset the component each turn or each game to reset internal states
                            key={`game-actions-${timelineVersion}-${moveHistory.length}`}
                            playerColor={currentPlayerColor}
                        />
                    </section>
                )}

                <section className="flex flex-row justify-evenly" aria-label="Game actions">
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
    );
}

export default GameInfoPanel;
