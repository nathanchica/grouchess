import { useContext, useEffect, useMemo, useRef, useState, createContext, type ReactNode } from 'react';

import invariant from 'tiny-invariant';

import { preloadToObjectURLs, decodeImage, type ImgSrcMap } from '../utils/preload';

type ImageContextType = {
    imgSrcMap: ImgSrcMap;
    isReady: boolean;
};

const ImageContext = createContext<ImageContextType>({
    imgSrcMap: {},
    isReady: false,
});

export const useImages = (): ImageContextType => {
    const context = useContext(ImageContext);
    invariant(context, 'useImages must be used within ImagesProvider');
    return context;
};

type Props = {
    imgSrcs: string[];
    children: ReactNode;
};

function ImagesProvider({ imgSrcs, children }: Props) {
    const [imgSrcMap, setImgSrcMap] = useState<ImgSrcMap>({});
    const [isReady, setIsReady] = useState(false);
    const objectUrlsRef = useRef<string[]>([]);

    // Stabilize inputs to avoid unnecessary reloads
    const uniqueSrcs = useMemo(() => Array.from(new Set(imgSrcs)), [imgSrcs]);

    useEffect(() => {
        let cancelled = false;

        async function preload() {
            try {
                const map = await preloadToObjectURLs(uniqueSrcs);
                // Track created object URLs for cleanup
                const createdUrls = Object.values(map).filter((imgSrc) => !uniqueSrcs.includes(imgSrc));
                objectUrlsRef.current.push(...createdUrls);

                // Decode all images to prevent initial render flicker
                const urlsToDecode = Array.from(new Set(Object.values(map)));
                await Promise.all(urlsToDecode.map((url) => decodeImage(url)));

                if (!cancelled) setImgSrcMap(map);
            } finally {
                if (!cancelled) setIsReady(true);
            }
        }

        preload();

        return () => {
            cancelled = true;
            for (const url of objectUrlsRef.current) URL.revokeObjectURL(url);
            objectUrlsRef.current = [];
        };
    }, [uniqueSrcs]);

    return <ImageContext.Provider value={{ imgSrcMap, isReady }}>{children}</ImageContext.Provider>;
}

export default ImagesProvider;
