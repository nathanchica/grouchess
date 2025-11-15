import { MemoryRouter } from 'react-router';
import { render } from 'vitest-browser-react';

import { ImageContext, type ImageContextType } from '../../../providers/ImagesProvider';
import { createMockImageContextValues } from '../../../providers/__mocks__/ImagesProvider';
import { aliasToPieceImageData } from '../../../utils/pieces';
import * as GameRoomFormHealthGateModule from '../../mainmenu/GameRoomFormHealthGate';
import MainMenuView from '../MainMenuView';

vi.mock(import('../../mainmenu/WaitingRoomView'), () => ({
    default: () => <div data-testid="waiting-room-view">WaitingRoomView</div>,
}));

vi.mock(import('../../mainmenu/ErrorView'), () => ({
    default: () => <div data-testid="error-view">ErrorView</div>,
}));

vi.mock(import('../../mainmenu/GameRoomFormHealthGate'), { spy: true });

vi.spyOn(GameRoomFormHealthGateModule, 'default').mockImplementation(({ onSelfPlayStart }) => (
    <div data-testid="game-room-form-health-gate">
        <button onClick={() => onSelfPlayStart(null)}>Start Self Play</button>
    </div>
));

const defaultProps = {
    onSelfPlayStart: vi.fn(),
};

type RenderMainMenuViewOptions = {
    propOverrides?: Partial<typeof defaultProps>;
    imageContextValues?: ImageContextType;
    initialRoute?: string;
};

function renderMainMenuView({
    propOverrides = {},
    imageContextValues = createMockImageContextValues(),
    initialRoute = '/',
}: RenderMainMenuViewOptions = {}) {
    return render(
        <ImageContext.Provider value={imageContextValues}>
            <MemoryRouter initialEntries={[initialRoute]}>
                <MainMenuView {...defaultProps} {...propOverrides} />
            </MemoryRouter>
        </ImageContext.Provider>
    );
}

describe('MainMenuView', () => {
    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Logo Image Resolution', () => {
        it('resolves the rook logo src through ImagesProvider when an optimized asset exists', async () => {
            const rookImageData = aliasToPieceImageData['R'];
            const optimizedSrc = 'blob:optimized-rook-image';
            const imageContextValues = createMockImageContextValues();
            imageContextValues.imgSrcMap[rookImageData.imgSrc] = optimizedSrc;
            imageContextValues.isReady = true;

            const { getByRole } = await renderMainMenuView({ imageContextValues });

            const images = getByRole('img').elements();
            const rookImage = images.find((img) => img.getAttribute('alt') === rookImageData.altText);

            expect(rookImage).toBeDefined();
            expect(rookImage?.getAttribute('src')).toBe(optimizedSrc);
            expect(rookImage?.getAttribute('alt')).toBe(rookImageData.altText);
        });

        it('falls back to the alias image when the provider does not have the rook asset cached', async () => {
            const rookImageData = aliasToPieceImageData['R'];
            const imageContextValues = createMockImageContextValues();
            imageContextValues.imgSrcMap = {};
            imageContextValues.isReady = false;

            const { getByRole } = await renderMainMenuView({ imageContextValues });

            const images = getByRole('img').elements();
            const rookImage = images.find((img) => img.getAttribute('alt') === rookImageData.altText);

            expect(rookImage).toBeDefined();
            expect(rookImage?.getAttribute('src')).toBe(rookImageData.imgSrc);
            expect(rookImage?.getAttribute('alt')).toBe(rookImageData.altText);
        });
    });

    describe('Routing', () => {
        it('navigates to WaitingRoomView when the route contains a room id parameter', async () => {
            const { getByTestId } = await renderMainMenuView({
                initialRoute: '/test-room-123',
            });

            const waitingRoomView = getByTestId('waiting-room-view');
            await expect.element(waitingRoomView).toBeInTheDocument();
        });

        it('renders GameRoomFormHealthGate on the root route', async () => {
            const { getByTestId } = await renderMainMenuView({
                initialRoute: '/',
            });

            const gameRoomFormHealthGate = getByTestId('game-room-form-health-gate');
            await expect.element(gameRoomFormHealthGate).toBeInTheDocument();
        });
    });

    describe('Error Boundary', () => {
        it('displays ErrorView when a descendant throws inside the ErrorBoundary', async () => {
            // Suppress console.error for this test since we're intentionally throwing
            vi.spyOn(console, 'error').mockImplementation(() => {});

            // Change the mock to throw an error for this test
            vi.spyOn(GameRoomFormHealthGateModule, 'default').mockImplementation(() => {
                throw new Error('Test error from child component');
            });

            const { getByTestId } = await renderMainMenuView();

            // ErrorView should be displayed
            const errorView = getByTestId('error-view');
            await expect.element(errorView).toBeInTheDocument();
        });
    });

    describe('Render', () => {
        it('renders the header with correct branding', async () => {
            const { getByRole, getByText } = await renderMainMenuView();

            const heading = getByRole('heading', { name: /grouchess/i });
            await expect.element(heading).toBeVisible();

            const tagline = getByText(/grouchess is a Lichess-clone project just for fun and learning/i);
            await expect.element(tagline).toBeVisible();
        });

        it('renders home link with correct href', async () => {
            const { getByRole } = await renderMainMenuView();

            const homeLink = getByRole('link');
            await expect.element(homeLink).toHaveAttribute('href', '/');
        });
    });
});
