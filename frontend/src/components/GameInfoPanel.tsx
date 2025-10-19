import { useState } from 'react';

import InfoCard from './InfoCard';
import LoadFENModal from './LoadFENModal';
import MoveHistoryTable from './MoveHistoryTable';
import ResetButton from './ResetButton';
import ShareBoardStateModal from './ShareBoardStateModal';
import TooltipContainer from './TooltipContainer';

import FileImportIcon from '../assets/icons/file-import.svg?react';
import ShareNodesIcon from '../assets/icons/share-nodes.svg?react';

function GameInfoPanel() {
    const [shareModalIsShowing, setShareModalIsShowing] = useState(false);
    const [loadFenModalIsShowing, setLoadFenModalIsShowing] = useState(false);

    const onShareModalDismiss = () => {
        setShareModalIsShowing(false);
    };

    const onShareButtonClick = () => {
        setShareModalIsShowing(true);
    };

    const onLoadFenButtonClick = () => {
        setLoadFenModalIsShowing(true);
    };

    const onLoadFenModalDismiss = () => {
        setLoadFenModalIsShowing(false);
    };

    return (
        <>
            <InfoCard className="h-full">
                <div className="xl:p-8 p-3 flex flex-col gap-4 h-full">
                    <MoveHistoryTable />

                    <section className="flex justify-between gap-8" aria-label="Game actions">
                        <TooltipContainer tooltipText="Reset">
                            <ResetButton />
                        </TooltipContainer>

                        <TooltipContainer tooltipText="Load FEN">
                            <button
                                type="button"
                                onClick={onLoadFenButtonClick}
                                aria-label="Load FEN"
                                aria-haspopup="dialog"
                                aria-controls={loadFenModalIsShowing ? 'load-fen-modal' : undefined}
                                className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            >
                                <FileImportIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </TooltipContainer>

                        <div className="grow" />

                        <TooltipContainer tooltipText="Share">
                            <button
                                type="button"
                                onClick={onShareButtonClick}
                                aria-label="Share"
                                aria-haspopup="dialog"
                                aria-controls={shareModalIsShowing ? 'share-board-modal' : undefined}
                                className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            >
                                <ShareNodesIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </TooltipContainer>
                    </section>
                </div>
            </InfoCard>

            {shareModalIsShowing && <ShareBoardStateModal onDismiss={onShareModalDismiss} />}
            {loadFenModalIsShowing && <LoadFENModal onDismiss={onLoadFenModalDismiss} />}
        </>
    );
}

export default GameInfoPanel;
