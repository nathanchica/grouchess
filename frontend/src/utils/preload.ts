// Utilities and a hook to preload a set of images, convert them to
// in-memory object URLs, and wait for decoding to finish to avoid flicker.

import { useEffect, useMemo, useRef, useState } from 'react';

export type ImgSrcMap = Record<string, string>;

export async function decodeImage(src: string): Promise<void> {
    const img = new Image();
    img.src = src;
    // Prefer HTMLImageElement.decode when available for deterministic decode
    if ('decode' in img) {
        try {
            await (img as HTMLImageElement).decode();
            return;
        } catch {
            // Fall back to load/error events
        }
    }
    await new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
    });
}

export async function preloadToObjectURLs(srcs: readonly string[]): Promise<ImgSrcMap> {
    const pairs = await Promise.all(
        Array.from(new Set(srcs)).map(async (src) => {
            try {
                const res = await fetch(src);
                const blob = await res.blob();
                const objUrl = URL.createObjectURL(blob);
                return [src, objUrl] as const;
            } catch {
                // If preload fails, fall back to original src
                return [src, src] as const;
            }
        })
    );
    return Object.fromEntries(pairs) as ImgSrcMap;
}

export function usePreloadedImages(srcs: readonly string[]) {
    const [imgSrcMap, setImgSrcMap] = useState<ImgSrcMap>({});
    const [isReady, setIsReady] = useState(false);
    const objectUrlsRef = useRef<string[]>([]);

    // Stabilize inputs to avoid unnecessary reloads
    const uniqueSrcs = useMemo(() => Array.from(new Set(srcs)), [srcs]);

    useEffect(() => {
        let cancelled = false;

        async function preload() {
            try {
                const map = await preloadToObjectURLs(uniqueSrcs);
                // Track created object URLs for cleanup
                const createdUrls = Object.values(map).filter((v) => !uniqueSrcs.includes(v));
                objectUrlsRef.current.push(...createdUrls);

                // Decode all images to prevent initial render flicker
                const urlsToDecode = Array.from(new Set(Object.values(map)));
                await Promise.all(urlsToDecode.map((u) => decodeImage(u)));

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

    return { imgSrcMap, isReady } as const;
}
