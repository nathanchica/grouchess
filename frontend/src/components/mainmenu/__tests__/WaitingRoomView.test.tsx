import { useParams } from 'react-router';
import { render } from 'vitest-browser-react';

import { useWaitingRoom } from '../../../hooks/useWaitingRoom';
import type { ChallengerWaitingRoomProps } from '../ChallengerWaitingRoom';
import type { CreatorWaitingRoomProps } from '../CreatorWaitingRoom';
import WaitingRoomView from '../WaitingRoomView';

// Mock dependencies
vi.mock('react-router', () => ({
    useParams: vi.fn(),
}));

vi.mock('../../../hooks/useWaitingRoom', () => ({
    useWaitingRoom: vi.fn(),
}));

vi.mock('../CreatorWaitingRoom', () => ({
    default: vi.fn(({ roomId }: CreatorWaitingRoomProps) => (
        <div data-testid="creator-waiting-room">CreatorWaitingRoom Mock - Room: {roomId}</div>
    )),
}));

vi.mock('../ChallengerWaitingRoom', () => ({
    default: vi.fn(({ roomId, onJoinGameRoom }: ChallengerWaitingRoomProps) => (
        <div data-testid="challenger-waiting-room">
            ChallengerWaitingRoom Mock - Room: {roomId}
            <button
                data-testid="mock-join-button"
                onClick={() => onJoinGameRoom({ roomId, playerId: 'test-player', token: 'test-token' })}
            >
                Mock Join
            </button>
        </div>
    )),
}));

describe('WaitingRoomView', () => {
    const mockRoomId = 'test-room-123';
    const mockPlayerId = 'player-456';
    const mockToken = 'test-token-789';

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('roomId validation', () => {
        beforeEach(() => {
            // Mock useWaitingRoom to return valid data to isolate roomId validation
            vi.mocked(useWaitingRoom).mockReturnValue({
                waitingRoomData: null,
                loadData: vi.fn(),
            });
        });

        it('throws error when roomId param is missing', async () => {
            vi.mocked(useParams).mockReturnValue({});

            await expect(render(<WaitingRoomView />)).rejects.toThrow('roomId param is required');
        });

        it('throws error when roomId param is null', async () => {
            vi.mocked(useParams).mockReturnValue({ roomId: null as unknown as string });

            await expect(render(<WaitingRoomView />)).rejects.toThrow('roomId param is required');
        });

        it('throws error when roomId param is empty string', async () => {
            vi.mocked(useParams).mockReturnValue({ roomId: '' });

            await expect(render(<WaitingRoomView />)).rejects.toThrow('roomId param is required');
        });
    });

    describe('conditional rendering based on user role', () => {
        it('renders CreatorWaitingRoom when waitingRoomData.isCreator is true', async () => {
            vi.mocked(useParams).mockReturnValue({ roomId: mockRoomId });
            vi.mocked(useWaitingRoom).mockReturnValue({
                waitingRoomData: {
                    roomId: mockRoomId,
                    playerId: mockPlayerId,
                    token: mockToken,
                    isCreator: true,
                },
                loadData: vi.fn(),
            });

            const { getByTestId } = await render(<WaitingRoomView />);

            await expect.element(getByTestId('creator-waiting-room')).toBeInTheDocument();
            await expect.element(getByTestId('challenger-waiting-room')).not.toBeInTheDocument();
        });

        it('renders ChallengerWaitingRoom when waitingRoomData.isCreator is false', async () => {
            vi.mocked(useParams).mockReturnValue({ roomId: mockRoomId });
            vi.mocked(useWaitingRoom).mockReturnValue({
                waitingRoomData: {
                    roomId: mockRoomId,
                    playerId: mockPlayerId,
                    token: mockToken,
                    isCreator: false,
                },
                loadData: vi.fn(),
            });

            const { getByTestId } = await render(<WaitingRoomView />);

            await expect.element(getByTestId('challenger-waiting-room')).toBeInTheDocument();
            await expect.element(getByTestId('creator-waiting-room')).not.toBeInTheDocument();
        });

        it('renders ChallengerWaitingRoom when waitingRoomData is null', async () => {
            vi.mocked(useParams).mockReturnValue({ roomId: mockRoomId });
            vi.mocked(useWaitingRoom).mockReturnValue({
                waitingRoomData: null,
                loadData: vi.fn(),
            });

            const { getByTestId } = await render(<WaitingRoomView />);

            await expect.element(getByTestId('challenger-waiting-room')).toBeInTheDocument();
            await expect.element(getByTestId('creator-waiting-room')).not.toBeInTheDocument();
        });

        it('renders ChallengerWaitingRoom when waitingRoomData is undefined', async () => {
            vi.mocked(useParams).mockReturnValue({ roomId: mockRoomId });
            vi.mocked(useWaitingRoom).mockReturnValue({
                waitingRoomData: undefined as unknown as null,
                loadData: vi.fn(),
            });

            const { getByTestId } = await render(<WaitingRoomView />);

            await expect.element(getByTestId('challenger-waiting-room')).toBeInTheDocument();
            await expect.element(getByTestId('creator-waiting-room')).not.toBeInTheDocument();
        });
    });

    describe('props passed to child components', () => {
        it('passes roomId to CreatorWaitingRoom', async () => {
            vi.mocked(useParams).mockReturnValue({ roomId: mockRoomId });
            vi.mocked(useWaitingRoom).mockReturnValue({
                waitingRoomData: {
                    roomId: mockRoomId,
                    playerId: mockPlayerId,
                    token: mockToken,
                    isCreator: true,
                },
                loadData: vi.fn(),
            });

            const { getByTestId } = await render(<WaitingRoomView />);

            const creatorRoom = getByTestId('creator-waiting-room');
            await expect.element(creatorRoom).toHaveTextContent(`Room: ${mockRoomId}`);
        });

        it('passes roomId and onJoinGameRoom to ChallengerWaitingRoom', async () => {
            const mockLoadData = vi.fn();
            vi.mocked(useParams).mockReturnValue({ roomId: mockRoomId });
            vi.mocked(useWaitingRoom).mockReturnValue({
                waitingRoomData: {
                    roomId: mockRoomId,
                    playerId: mockPlayerId,
                    token: mockToken,
                    isCreator: false,
                },
                loadData: mockLoadData,
            });

            const { getByTestId } = await render(<WaitingRoomView />);

            const challengerRoom = getByTestId('challenger-waiting-room');
            await expect.element(challengerRoom).toHaveTextContent(`Room: ${mockRoomId}`);

            // Click the mock button to trigger onJoinGameRoom
            const joinButton = getByTestId('mock-join-button');
            await joinButton.click();

            // Verify loadData was called with the payload from onJoinGameRoom
            expect(mockLoadData).toHaveBeenCalledWith({
                roomId: mockRoomId,
                playerId: 'test-player',
                token: 'test-token',
            });
        });
    });
});
