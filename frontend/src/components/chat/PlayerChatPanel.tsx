import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import ChatMessage from './ChatMessage';

import { usePlayerChatSocket } from '../../providers/PlayerChatSocketProvider';

const MAX_MESSAGE_LENGTH = 140;

type Props = {
    currentPlayerId: string;
};

function PlayerChatPanel({ currentPlayerId }: Props) {
    const {
        messages,
        sendStandardMessage,
        acceptDrawOffer,
        declineDrawOffer,
        acceptRematchOffer,
        declineRematchOffer,
    } = usePlayerChatSocket();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState('');

    const handleSubmit = () => {
        if (!inputValue.trim() || !currentPlayerId) return;

        sendStandardMessage(inputValue.trim());
        setInputValue('');
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            handleSubmit();
        }
    };

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages.length]);

    return (
        <div className="flex flex-col h-full bg-zinc-900/80 border border-gray-400/50 rounded-xl overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        currentPlayerId={currentPlayerId}
                        onDrawAccept={acceptDrawOffer}
                        onDrawDecline={declineDrawOffer}
                        onRematchAccept={acceptRematchOffer}
                        onRematchDecline={declineRematchOffer}
                    />
                ))}
                <div ref={messagesEndRef} />
            </div>
            <div className="border-gray-300 p-3">
                {inputValue && (
                    <div className="text-xs text-zinc-400 text-right mb-1">
                        {inputValue.length}/{MAX_MESSAGE_LENGTH}
                    </div>
                )}
                <input
                    type="text"
                    value={inputValue}
                    onChange={(event) => setInputValue(event.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message"
                    maxLength={MAX_MESSAGE_LENGTH}
                    className="w-full bg-zinc-800 px-3 py-2 rounded-lg focus:outline-none placeholder:text-zinc-400 text-zinc-200"
                />
            </div>
        </div>
    );
}

export default PlayerChatPanel;
