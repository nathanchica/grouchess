import type { ImageContextType } from '../ImagesProvider';

export function createMockImageContextValues(overrides?: Partial<ImageContextType>): ImageContextType {
    return {
        imgSrcMap: {},
        isReady: false,
        ...overrides,
    };
}
