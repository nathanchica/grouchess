import { isOfferMessageType, isOfferResponseMessageType } from '@grouchess/game-room';
import type { Message } from '@grouchess/models';

type OfferResponseActionProps = {
    onAccept: () => void;
    onDecline: () => void;
    acceptLabel: string;
    declineLabel: string;
};

const ACTION_BUTTON_CLASSES = 'hover:text-zinc-100 text-zinc-300 cursor-pointer p-1 transition';

function formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

type Props = {
    message: Message;
    currentPlayerId: string;
    onDrawAccept: () => void;
    onDrawDecline: () => void;
    onRematchAccept: () => void;
    onRematchDecline: () => void;
};

function ChatMessage({
    message,
    currentPlayerId,
    onDrawAccept,
    onDrawDecline,
    onRematchAccept,
    onRematchDecline,
}: Props) {
    const { authorId, content, createdAt, type, id } = message;

    const isStandardMessage = type === 'standard';
    const isCurrentUser = authorId === currentPlayerId;

    let bgColor = isCurrentUser ? 'bg-sky-800' : 'bg-slate-500';
    if (!isStandardMessage) {
        bgColor = 'bg-slate-700';
    }

    let contentTextStyle = '';
    if (isOfferResponseMessageType(type) || isOfferMessageType(type)) {
        contentTextStyle = 'italic text-zinc-300';
    }

    let contentText = content;
    if (type === 'draw-offer' && isCurrentUser) {
        contentText = 'You offered a draw...';
    } else if (type === 'rematch-offer' && isCurrentUser) {
        contentText = 'You offered a rematch...';
    }

    let footer = null;
    if (isStandardMessage) {
        footer = (
            <span className={`text-xs text-zinc-200 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                {formatTime(createdAt)}
            </span>
        );
    }

    let offerResponseActionProps: OfferResponseActionProps | null = null;
    if (type === 'draw-offer') {
        offerResponseActionProps = {
            onAccept: onDrawAccept,
            onDecline: onDrawDecline,
            acceptLabel: 'Accept draw offer',
            declineLabel: 'Decline draw offer',
        };
    } else if (type === 'rematch-offer') {
        offerResponseActionProps = {
            onAccept: onRematchAccept,
            onDecline: onRematchDecline,
            acceptLabel: 'Accept rematch offer',
            declineLabel: 'Decline rematch offer',
        };
    }
    if (offerResponseActionProps && !isCurrentUser) {
        const { onAccept, onDecline, acceptLabel, declineLabel } = offerResponseActionProps;
        footer = (
            <section className="text-xs flex flex-row justify-evenly">
                <button type="button" className={ACTION_BUTTON_CLASSES} onClick={onAccept} aria-label={acceptLabel}>
                    Accept
                </button>
                <button type="button" className={ACTION_BUTTON_CLASSES} onClick={onDecline} aria-label={declineLabel}>
                    Decline
                </button>
            </section>
        );
    }

    return (
        <div key={id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
            <div
                className={`${bgColor} text-white rounded-lg p-2 max-w-[80%] flex flex-col ${isStandardMessage ? 'gap-1' : 'gap-3'}`}
            >
                <span
                    className={`text-sm ${contentTextStyle} break-words ${isCurrentUser ? 'text-right' : 'text-left'}`}
                >
                    {contentText}
                </span>

                {footer}
            </div>
        </div>
    );
}

export default ChatMessage;
