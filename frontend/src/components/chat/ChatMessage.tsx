import type { Message } from '@grouchess/game-room';

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
};

function ChatMessage({ message, currentPlayerId, onDrawAccept, onDrawDecline }: Props) {
    const { authorId, content, createdAt, type, id } = message;

    const isStandardMessage = type === 'standard';
    const isCurrentUser = authorId === currentPlayerId;

    let bgColor = isCurrentUser ? 'bg-sky-800' : 'bg-slate-500';
    if (!isStandardMessage) {
        bgColor = 'bg-slate-700';
    }

    let contentText = content;
    let contentTextStyle = '';
    if (type === 'draw-offer' && isCurrentUser) {
        contentText = 'You offered a draw...';
        contentTextStyle = 'italic text-zinc-300';
    } else if (type === 'draw-decline') {
        contentTextStyle = 'italic text-zinc-300';
    } else if (type === 'draw-accept') {
        contentTextStyle = 'italic text-zinc-300';
    }

    let footer = null;
    if (isStandardMessage) {
        footer = (
            <span className={`text-xs text-zinc-200 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                {formatTime(createdAt)}
            </span>
        );
    }
    if (type === 'draw-offer' && !isCurrentUser) {
        footer = (
            <section className="text-xs flex flex-row justify-evenly">
                <button
                    type="button"
                    className={ACTION_BUTTON_CLASSES}
                    onClick={onDrawAccept}
                    aria-label="Accept draw offer"
                >
                    Accept
                </button>
                <button
                    type="button"
                    className={ACTION_BUTTON_CLASSES}
                    onClick={onDrawDecline}
                    aria-label="Decline draw offer"
                >
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
