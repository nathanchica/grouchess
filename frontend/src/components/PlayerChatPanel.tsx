import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { useGameRoom } from '../providers/GameRoomProvider';

function formatTime(date: Date): string {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedHours = hours % 12 || 12;
    const formattedMinutes = minutes.toString().padStart(2, '0');
    return `${formattedHours}:${formattedMinutes} ${ampm}`;
}

function PlayerChatPanel() {
    const { room, currentPlayerId, addMessage } = useGameRoom();
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState('');

    const standardMessages = room?.messages.filter(({ type }) => type === 'standard') ?? [];

    const handleSubmit = () => {
        if (!inputValue.trim() || !currentPlayerId) return;

        const message = {
            id: `msg-${Date.now()}-${Math.random()}`,
            type: 'standard' as const,
            createdAt: new Date(),
            authorId: currentPlayerId,
            content: inputValue.trim(),
        };

        addMessage(message);
        setInputValue('');
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [standardMessages.length]);

    if (!room) return null;

    return (
        <div className="flex flex-col h-full border border-gray-400 rounded-lg overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {standardMessages.map((message) => {
                    const isCurrentUser = message.authorId === currentPlayerId;
                    const bgColor = isCurrentUser ? 'bg-sky-800' : 'bg-slate-500';

                    return (
                        <div
                            key={message.id}
                            className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                        >
                            <div className={`${bgColor} text-white rounded-lg p-2 max-w-[80%]`}>
                                <div className={`text-sm break-words ${isCurrentUser ? 'text-right' : 'text-left'}`}>
                                    {message.content}
                                </div>
                                <div
                                    className={`text-xs opacity-75 mt-1 ${isCurrentUser ? 'text-right' : 'text-left'}`}
                                >
                                    {formatTime(message.createdAt)}
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>
            <div className="border-gray-300 p-3">
                <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message"
                    className="w-full bg-zinc-700 px-3 py-2 rounded-lg focus:outline-none placeholder:text-zinc-400 text-zinc-200"
                />
            </div>
        </div>
    );
}

export default PlayerChatPanel;
