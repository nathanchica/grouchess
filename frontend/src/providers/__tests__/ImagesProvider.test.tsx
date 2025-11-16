import { type ReactNode } from 'react';

import { render } from 'vitest-browser-react';

import * as preloadModule from '../../utils/preload';
import ImagesProvider, { useImages } from '../ImagesProvider';

vi.mock('../../utils/preload', { spy: true });

// Helper component to consume the context for testing
const ImagesConsumer = () => {
    const { imgSrcMap, isReady } = useImages();
    return (
        <div data-testid="images-consumer">
            <span data-testid="is-ready">{isReady ? 'ready' : 'not-ready'}</span>
            <div data-testid="img-src-map">{JSON.stringify(imgSrcMap)}</div>
        </div>
    );
};

type RenderImagesProviderOptions = {
    imgSrcs?: string[];
    children?: ReactNode;
};

function renderImagesProvider({ imgSrcs = [], children = <ImagesConsumer /> }: RenderImagesProviderOptions = {}) {
    return render(<ImagesProvider imgSrcs={imgSrcs}>{children}</ImagesProvider>);
}

describe('ImagesProvider', () => {
    beforeEach(() => {
        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockResolvedValue({});
        vi.spyOn(preloadModule, 'decodeImage').mockResolvedValue();
    });

    it('preloads unique image sources and exposes the imgSrcMap via context', async () => {
        const imgSrcs = ['/img1.png', '/img2.png', '/img1.png', '/img3.png'];
        const mockImgSrcMap = {
            '/img1.png': 'blob:img1',
            '/img2.png': 'blob:img2',
            '/img3.png': 'blob:img3',
        };

        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockResolvedValue(mockImgSrcMap);

        const { getByTestId } = await renderImagesProvider({ imgSrcs });

        // Wait for preload to complete
        await vi.waitFor(() => {
            const imgSrcMapElement = getByTestId('img-src-map');
            expect(imgSrcMapElement).toHaveTextContent(JSON.stringify(mockImgSrcMap));
        });

        // Verify only unique sources were passed to preload
        expect(preloadModule.preloadToObjectURLs).toHaveBeenCalledWith(['/img1.png', '/img2.png', '/img3.png']);
    });

    it('sets isReady only after all images are decoded', async () => {
        const imgSrcs = ['/img1.png', '/img2.png'];
        const mockImgSrcMap = {
            '/img1.png': 'blob:img1',
            '/img2.png': 'blob:img2',
        };

        let resolvePreload: (value: typeof mockImgSrcMap) => void;
        const preloadPromise = new Promise<typeof mockImgSrcMap>((resolve) => {
            resolvePreload = resolve;
        });

        let resolveDecodeImg1: () => void;
        let resolveDecodeImg2: () => void;
        const decodePromises: Promise<void>[] = [];
        decodePromises.push(
            new Promise<void>((resolve) => {
                resolveDecodeImg1 = resolve;
            })
        );
        decodePromises.push(
            new Promise<void>((resolve) => {
                resolveDecodeImg2 = resolve;
            })
        );

        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockReturnValue(preloadPromise);
        vi.spyOn(preloadModule, 'decodeImage').mockImplementation((src: string) => {
            if (src === 'blob:img1') return decodePromises[0];
            if (src === 'blob:img2') return decodePromises[1];
            return Promise.resolve();
        });

        const { getByTestId } = await renderImagesProvider({ imgSrcs });

        const isReadyElement = getByTestId('is-ready');

        // Initially not ready
        expect(isReadyElement).toHaveTextContent('not-ready');

        // Resolve preload
        resolvePreload!(mockImgSrcMap);
        await vi.waitFor(() => {
            // Still not ready after preload, waiting for decode
            expect(isReadyElement).toHaveTextContent('not-ready');
        });

        // Resolve first decode
        resolveDecodeImg1!();
        await vi.waitFor(() => {
            // Still not ready, one decode pending
            expect(isReadyElement).toHaveTextContent('not-ready');
        });

        // Resolve second decode
        resolveDecodeImg2!();
        await vi.waitFor(() => {
            // Now ready after all decodes complete
            expect(isReadyElement).toHaveTextContent('ready');
        });

        // Verify all images were decoded
        expect(preloadModule.decodeImage).toHaveBeenCalledWith('blob:img1');
        expect(preloadModule.decodeImage).toHaveBeenCalledWith('blob:img2');
    });

    it('revokes created object URLs on unmount', async () => {
        const imgSrcs = ['/img1.png', '/img2.png'];
        const mockImgSrcMap = {
            '/img1.png': 'blob:img1',
            '/img2.png': '/img2.png', // This one failed to preload, kept original
        };

        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockResolvedValue(mockImgSrcMap);

        const { unmount } = await renderImagesProvider({ imgSrcs });

        // Wait for preload to complete
        await vi.waitFor(() => {
            expect(preloadModule.preloadToObjectURLs).toHaveBeenCalled();
        });

        unmount();

        // Only the blob URL should be revoked, not the original src
        expect(revokeObjectURLSpy).toHaveBeenCalledWith('blob:img1');
        expect(revokeObjectURLSpy).toHaveBeenCalledTimes(1);
    });

    it('skips unnecessary reloads when imgSrcs reference is stable', async () => {
        const imgSrcs = ['/img1.png', '/img2.png']; // Same array reference
        const mockImgSrcMap = {
            '/img1.png': 'blob:img1',
            '/img2.png': 'blob:img2',
        };

        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockResolvedValue(mockImgSrcMap);

        const { rerender } = await renderImagesProvider({ imgSrcs });

        // Wait for initial preload
        await vi.waitFor(() => {
            expect(preloadModule.preloadToObjectURLs).toHaveBeenCalledTimes(1);
        });

        // Rerender with same array reference
        await rerender(
            <ImagesProvider imgSrcs={imgSrcs}>
                <ImagesConsumer />
            </ImagesProvider>
        );

        // Should not trigger another preload since reference is the same
        expect(preloadModule.preloadToObjectURLs).toHaveBeenCalledTimes(1);
    });

    it('triggers reload when imgSrcs values change', async () => {
        const imgSrcs1 = ['/img1.png', '/img2.png'];
        const imgSrcs2 = ['/img1.png', '/img3.png']; // Different values
        const mockImgSrcMap1 = {
            '/img1.png': 'blob:img1',
            '/img2.png': 'blob:img2',
        };
        const mockImgSrcMap2 = {
            '/img1.png': 'blob:img1',
            '/img3.png': 'blob:img3',
        };

        vi.spyOn(preloadModule, 'preloadToObjectURLs')
            .mockResolvedValueOnce(mockImgSrcMap1)
            .mockResolvedValueOnce(mockImgSrcMap2);

        const { rerender } = await renderImagesProvider({ imgSrcs: imgSrcs1 });

        // Wait for initial preload
        await vi.waitFor(() => {
            expect(preloadModule.preloadToObjectURLs).toHaveBeenCalledTimes(1);
        });

        // Rerender with different values
        await rerender(
            <ImagesProvider imgSrcs={imgSrcs2}>
                <ImagesConsumer />
            </ImagesProvider>
        );

        // Should trigger another preload
        await vi.waitFor(() => {
            expect(preloadModule.preloadToObjectURLs).toHaveBeenCalledTimes(2);
        });
        expect(preloadModule.preloadToObjectURLs).toHaveBeenNthCalledWith(2, ['/img1.png', '/img3.png']);
    });

    it('handles empty imgSrcs array', async () => {
        const mockImgSrcMap = {};

        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockResolvedValue(mockImgSrcMap);

        const { getByTestId } = await renderImagesProvider({ imgSrcs: [] });

        await vi.waitFor(() => {
            const isReadyElement = getByTestId('is-ready');
            expect(isReadyElement).toHaveTextContent('ready');
        });

        const imgSrcMapElement = getByTestId('img-src-map');
        expect(imgSrcMapElement).toHaveTextContent('{}');
        expect(preloadModule.preloadToObjectURLs).toHaveBeenCalledWith([]);
    });

    it('deduplicates object URLs before decoding', async () => {
        const imgSrcs = ['/img1.png', '/img2.png'];
        const mockImgSrcMap = {
            '/img1.png': 'blob:same',
            '/img2.png': 'blob:same', // Both map to same blob
        };

        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockResolvedValue(mockImgSrcMap);
        const decodeImageSpy = vi.spyOn(preloadModule, 'decodeImage').mockResolvedValue();

        await renderImagesProvider({ imgSrcs });

        // Wait for preload to complete
        await vi.waitFor(() => {
            expect(decodeImageSpy).toHaveBeenCalled();
        });

        // Should only decode the unique blob URL once
        expect(decodeImageSpy).toHaveBeenCalledTimes(1);
        expect(decodeImageSpy).toHaveBeenCalledWith('blob:same');
    });

    it('handles cleanup when unmounted before preload completes', async () => {
        const imgSrcs = ['/img1.png'];
        let resolvePreload: (value: Record<string, string>) => void;
        const preloadPromise = new Promise<Record<string, string>>((resolve) => {
            resolvePreload = resolve;
        });

        const revokeObjectURLSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});
        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockReturnValue(preloadPromise);
        vi.spyOn(preloadModule, 'decodeImage').mockResolvedValue();

        const { unmount } = await renderImagesProvider({ imgSrcs });

        // Unmount before preload completes
        unmount();

        // Cleanup should be called immediately on unmount
        expect(revokeObjectURLSpy).toHaveBeenCalled();

        // Resolve preload after unmount - shouldn't cause errors
        resolvePreload!({ '/img1.png': 'blob:img1' });

        // Wait to ensure no state updates occur (would cause React warnings)
        await new Promise((resolve) => setTimeout(resolve, 50));
    });
});

describe('useImages', () => {
    it('returns image context values when used within ImagesProvider', async () => {
        const imgSrcs = ['/img1.png'];
        const mockImgSrcMap = { '/img1.png': 'blob:img1' };

        vi.spyOn(preloadModule, 'preloadToObjectURLs').mockResolvedValue(mockImgSrcMap);

        const { getByTestId } = await renderImagesProvider({ imgSrcs });

        const consumer = getByTestId('images-consumer');
        expect(consumer).toBeInTheDocument();

        await vi.waitFor(() => {
            const isReadyElement = getByTestId('is-ready');
            expect(isReadyElement).toHaveTextContent('ready');
        });
    });

    it('throws when used outside of ImagesProvider', async () => {
        // Mock console.error to prevent it from polluting the test output
        vi.spyOn(console, 'error').mockImplementation(() => {});

        await expect(async () => {
            await render(<ImagesConsumer />);
        }).rejects.toThrow('useImages must be used within ImagesProvider');
    });
});
