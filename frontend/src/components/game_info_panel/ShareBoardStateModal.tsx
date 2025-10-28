import { createFEN } from '@grouchess/chess';
import invariant from 'tiny-invariant';

import DismissIcon from '../../assets/icons/xmark.svg?react';
import { useDismissOnEscape } from '../../hooks/useDismissOnEscape';
import { useChessGame } from '../../providers/ChessGameRoomProvider';
import CopyableTextField from '../common/CopyableTextField';
import InfoCard from '../common/InfoCard';

type Props = {
    onDismiss: () => void;
};

function ShareBoardStateModal({ onDismiss }: Props) {
    useDismissOnEscape(onDismiss);
    const { chessGame } = useChessGame();
    invariant(chessGame, 'chessGame is required to share board state');
    const { boardState } = chessGame;

    const fenString = createFEN(boardState);

    return (
        <div
            id="share-board-modal"
            aria-labelledby="share-board-modal-title"
            className="fixed inset-0 z-30 grid place-items-center"
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
        >
            <div className="fixed inset-0 bg-black/40 z-10" onClick={onDismiss} aria-hidden="true" />
            <div className="relative z-20">
                <InfoCard className="w-[min(90vw,32rem)]">
                    <div className="px-6 pt-4 pb-8">
                        <section className="flex justify-between items-baseline mb-6">
                            <h2 id="share-board-modal-title" className="text-lg text-slate-50 font-semibold">
                                Share
                            </h2>
                            <button
                                type="button"
                                onClick={onDismiss}
                                aria-label="Close"
                                className="text-slate-400 hover:text-slate-100 cursor-pointer"
                            >
                                <DismissIcon className="w-5 h-5" aria-hidden="true" />
                            </button>
                        </section>

                        <CopyableTextField
                            text={fenString}
                            label="FEN"
                            id="fen-string"
                            copyButtonAriaLabel="Copy FEN"
                        />
                    </div>
                </InfoCard>
            </div>
        </div>
    );
}

export default ShareBoardStateModal;
