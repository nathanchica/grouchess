// Utilities to preload a set of images and convert them to in-memory object URLs

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
