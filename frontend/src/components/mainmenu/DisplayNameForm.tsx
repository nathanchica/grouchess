import { useState, type ChangeEvent } from 'react';

type Props = {
    onDisplayNameChange: (name: string) => void;
};

function DisplayNameForm({ onDisplayNameChange }: Props) {
    const [displayName, setDisplayName] = useState('');

    const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
        const { value } = event.target;
        setDisplayName(value);
        onDisplayNameChange(value);
    };

    return (
        <form className="flex flex-col gap-4">
            <label htmlFor="display-name" className="text-lg sm:text-xl font-medium text-zinc-100">
                Display Name (optional)
            </label>
            <input
                id="display-name"
                type="text"
                placeholder="Enter your display name"
                className="w-full rounded-md border border-zinc-700 bg-zinc-900/50 px-4 py-2 text-zinc-100 placeholder-zinc-500 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                value={displayName}
                onChange={handleInputChange}
            />
        </form>
    );
}

export default DisplayNameForm;
