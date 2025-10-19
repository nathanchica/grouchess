import { useState } from 'react';

import InfoCard from './InfoCard';
import MoveHistoryTable from './MoveHistoryTable';
import ResetButton from './ResetButton';
import ShareBoardStateModal from './ShareBoardStateModal';
import TooltipContainer from './TooltipContainer';

import ShareNodesIcon from '../assets/icons/share-nodes.svg?react';

function GameInfoPanel() {
    const [shareModalIsShowing, setShareModalIsShowing] = useState(false);

    const onShareModalDismiss = () => {
        setShareModalIsShowing(false);
    };

    const onShareButtonClick = () => {
        setShareModalIsShowing(true);
    };

    return (
        <>
            <InfoCard className="h-full">
                <div className="xl:p-8 p-3 flex flex-col gap-4 h-full">
                    <MoveHistoryTable />

                    <section className="flex justify-between">
                        <TooltipContainer tooltipText="Reset">
                            <ResetButton />
                        </TooltipContainer>

                        <TooltipContainer tooltipText="Share">
                            <button
                                type="button"
                                onClick={onShareButtonClick}
                                aria-label="Share"
                                className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
                            >
                                <ShareNodesIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </TooltipContainer>
                    </section>
                </div>
            </InfoCard>

            {shareModalIsShowing && <ShareBoardStateModal onDismiss={onShareModalDismiss} />}
        </>
    );
}

export default GameInfoPanel;
