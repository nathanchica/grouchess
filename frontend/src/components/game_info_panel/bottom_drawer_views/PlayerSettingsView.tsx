import MoveNotationControls from './MoveNotationControls';
import SoundControls from './SoundControls';

function PlayerSettingsView() {
    return (
        <div className="flex flex-col w-full gap-4">
            <SoundControls />
            <MoveNotationControls />
        </div>
    );
}

export default PlayerSettingsView;
