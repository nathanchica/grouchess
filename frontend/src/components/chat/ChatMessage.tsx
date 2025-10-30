import type { Message } from '@grouchess/game-room';

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
};

function ChatMessage({ message, currentPlayerId }: Props) {
    const isCurrentUser = message.authorId === currentPlayerId;
    const bgColor = isCurrentUser ? 'bg-sky-800' : 'bg-slate-500';

    return (
        <div key={message.id} className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
            <div className={`${bgColor} text-white rounded-lg p-2 max-w-[80%]`}>
                <div className={`text-sm break-words ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    {message.content}
                </div>
                <div className={`text-xs opacity-75 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                    {formatTime(message.createdAt)}
                </div>
            </div>
        </div>
    );
}

export default ChatMessage;
