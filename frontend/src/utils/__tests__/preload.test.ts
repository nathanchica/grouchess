import type { Mock } from 'vitest';

import { decodeImage, preloadToObjectURLs, type ImgSrcMap } from '../preload';

interface MockImageInstance {
    src: string;
    decode?: () => Promise<void>;
    onload: (() => void) | null;
    onerror: (() => void) | null;
}

function createMockImage(options: { decode?: (() => Promise<void>) | null } = {}) {
    let capturedInstance: MockImageInstance | null = null;

    class MockImage implements MockImageInstance {
        src = '';
        decode?: () => Promise<void> = options.decode ?? undefined;
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;

        constructor() {
            // eslint-disable-next-line @typescript-eslint/no-this-alias -- Capturing instance for test assertions
            capturedInstance = this;
        }
    }

    return {
        MockImageClass: MockImage as unknown as typeof Image,
        getInstance: () => capturedInstance,
    };
}

describe('decodeImage', () => {
    let getInstance: () => ReturnType<typeof createMockImage>['getInstance'] extends () => infer T ? T : never;
    let OriginalImage: typeof Image;

    beforeEach(() => {
        OriginalImage = globalThis.Image;
        const mock = createMockImage({ decode: vi.fn().mockResolvedValue(undefined) });
        getInstance = mock.getInstance;
        globalThis.Image = mock.MockImageClass;
    });

    afterEach(() => {
        globalThis.Image = OriginalImage;
        vi.restoreAllMocks();
    });

    it('successfully decodes image using HTMLImageElement.decode()', async () => {
        const src = 'https://example.com/image.png';

        await decodeImage(src);

        expect(getInstance()).not.toBeNull();
        expect(getInstance()!.src).toBe(src);
        expect(getInstance()!.decode).toHaveBeenCalledOnce();
    });

    it('falls back to load event when decode() throws error', async () => {
        const src = 'https://example.com/image.png';
        // Override decode to throw error after constructor runs
        const decodeSpy = vi.fn().mockRejectedValue(new Error('Decode failed'));
        const mock = createMockImage({ decode: decodeSpy });
        getInstance = mock.getInstance;
        globalThis.Image = mock.MockImageClass;

        const promise = decodeImage(src);

        // Wait for decode to be called and fail
        await vi.waitFor(() => {
            expect(getInstance()).not.toBeNull();
            expect(getInstance()!.onload).not.toBeNull();
        });

        // Trigger onload callback
        getInstance()!.onload!();

        await promise;

        expect(getInstance()!.src).toBe(src);
        expect(decodeSpy).toHaveBeenCalledOnce();
    });

    it('resolves when load event triggers onerror callback', async () => {
        const src = 'https://example.com/image.png';
        const decodeSpy = vi.fn().mockRejectedValue(new Error('Decode failed'));
        const mock = createMockImage({ decode: decodeSpy });
        getInstance = mock.getInstance;
        globalThis.Image = mock.MockImageClass;

        const promise = decodeImage(src);

        // Wait for decode to be called and fail
        await vi.waitFor(() => {
            expect(getInstance()).not.toBeNull();
            expect(getInstance()!.onerror).not.toBeNull();
        });

        // Trigger onerror callback
        getInstance()!.onerror!();

        await promise;

        expect(getInstance()!.src).toBe(src);
    });

    it('uses load event fallback when decode method is not available', async () => {
        const src = 'https://example.com/image.png';
        // Create Image without decode method to simulate older browser
        const mock = createMockImage({ decode: null });
        getInstance = mock.getInstance;
        globalThis.Image = mock.MockImageClass;

        const promise = decodeImage(src);

        // Wait for onload to be set
        await vi.waitFor(() => {
            expect(getInstance()).not.toBeNull();
            expect(getInstance()!.onload).not.toBeNull();
        });

        // Trigger onload callback
        getInstance()!.onload!();

        await promise;

        expect(getInstance()!.src).toBe(src);
    });

    it('uses load event fallback when decode method is undefined', async () => {
        const src = 'https://example.com/image.png';
        // Create Image without decode method to simulate older browser
        const mock = createMockImage({ decode: undefined });
        getInstance = mock.getInstance;
        globalThis.Image = mock.MockImageClass;

        const promise = decodeImage(src);

        // Wait for onload to be set
        await vi.waitFor(() => {
            expect(getInstance()).not.toBeNull();
            expect(getInstance()!.onload).not.toBeNull();
        });

        // Trigger onload callback
        getInstance()!.onload!();

        await promise;

        expect(getInstance()!.src).toBe(src);
    });

    it('uses error event fallback when decode method is not available', async () => {
        const src = 'https://example.com/image.png';
        // Create Image without decode method to simulate older browser
        const mock = createMockImage({ decode: null });
        getInstance = mock.getInstance;
        globalThis.Image = mock.MockImageClass;

        const promise = decodeImage(src);

        // Wait for onerror to be set
        await vi.waitFor(() => {
            expect(getInstance()).not.toBeNull();
            expect(getInstance()!.onerror).not.toBeNull();
        });

        // Trigger onerror callback
        getInstance()!.onerror!();

        await promise;

        expect(getInstance()!.src).toBe(src);
    });
});

describe('preloadToObjectURLs', () => {
    let fetchSpy: Mock<typeof fetch>;
    let createObjectURLSpy: Mock<typeof URL.createObjectURL>;
    let objectURLCounter: number;

    beforeEach(() => {
        objectURLCounter = 0;
        fetchSpy = vi.spyOn(window, 'fetch');
        createObjectURLSpy = vi.spyOn(URL, 'createObjectURL').mockImplementation(() => {
            return `blob:mock-url-${++objectURLCounter}`;
        });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('successfully preloads single image to object URL', async () => {
        const src = 'https://example.com/image.png';
        const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
        const mockResponse = {
            blob: vi.fn().mockResolvedValue(mockBlob),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await preloadToObjectURLs([src]);

        expect(fetchSpy).toHaveBeenCalledWith(src);
        expect(createObjectURLSpy).toHaveBeenCalledWith(mockBlob);
        expect(result).toEqual({
            [src]: 'blob:mock-url-1',
        });
    });

    it('successfully preloads multiple images to object URLs', async () => {
        const srcs = [
            'https://example.com/image1.png',
            'https://example.com/image2.png',
            'https://example.com/image3.png',
        ];
        const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
        const mockResponse = {
            blob: vi.fn().mockResolvedValue(mockBlob),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await preloadToObjectURLs(srcs);

        expect(fetchSpy).toHaveBeenCalledTimes(3);
        expect(createObjectURLSpy).toHaveBeenCalledTimes(3);
        expect(result).toEqual({
            [srcs[0]]: 'blob:mock-url-1',
            [srcs[1]]: 'blob:mock-url-2',
            [srcs[2]]: 'blob:mock-url-3',
        });
    });

    it('deduplicates URLs and fetches each unique URL only once', async () => {
        const srcs = [
            'https://example.com/image1.png',
            'https://example.com/image2.png',
            'https://example.com/image1.png', // duplicate
            'https://example.com/image2.png', // duplicate
        ];
        const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
        const mockResponse = {
            blob: vi.fn().mockResolvedValue(mockBlob),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await preloadToObjectURLs(srcs);

        // Should only fetch unique URLs
        expect(fetchSpy).toHaveBeenCalledTimes(2);
        expect(createObjectURLSpy).toHaveBeenCalledTimes(2);
        expect(result).toEqual({
            'https://example.com/image1.png': 'blob:mock-url-1',
            'https://example.com/image2.png': 'blob:mock-url-2',
        });
    });

    it('falls back to original src when fetch fails', async () => {
        const srcs = ['https://example.com/image1.png', 'https://example.com/image2.png'];
        fetchSpy.mockRejectedValueOnce(new Error('Network error'));
        const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
        const mockResponse = {
            blob: vi.fn().mockResolvedValue(mockBlob),
        } as unknown as Response;
        fetchSpy.mockResolvedValueOnce(mockResponse);

        const result = await preloadToObjectURLs(srcs);

        expect(fetchSpy).toHaveBeenCalledTimes(2);
        // Only successful fetch should create object URL
        expect(createObjectURLSpy).toHaveBeenCalledTimes(1);
        expect(result).toEqual({
            [srcs[0]]: srcs[0], // Falls back to original src
            [srcs[1]]: 'blob:mock-url-1', // Successfully preloaded
        });
    });

    it('falls back to original src when blob creation fails', async () => {
        const src = 'https://example.com/image.png';
        const mockResponse = {
            blob: vi.fn().mockRejectedValue(new Error('Blob creation failed')),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result = await preloadToObjectURLs([src]);

        expect(fetchSpy).toHaveBeenCalledWith(src);
        expect(createObjectURLSpy).not.toHaveBeenCalled();
        expect(result).toEqual({
            [src]: src, // Falls back to original src
        });
    });

    it('returns empty object when given empty array', async () => {
        const result = await preloadToObjectURLs([]);

        expect(fetchSpy).not.toHaveBeenCalled();
        expect(createObjectURLSpy).not.toHaveBeenCalled();
        expect(result).toEqual({});
    });

    it('returns correct type ImgSrcMap', async () => {
        const src = 'https://example.com/image.png';
        const mockBlob = new Blob(['fake-image-data'], { type: 'image/png' });
        const mockResponse = {
            blob: vi.fn().mockResolvedValue(mockBlob),
        } as unknown as Response;
        fetchSpy.mockResolvedValue(mockResponse);

        const result: ImgSrcMap = await preloadToObjectURLs([src]);

        expect(result).toBeDefined();
        expect(typeof result).toBe('object');
    });
});
