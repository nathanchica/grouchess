import { useContext, createContext, type ReactNode } from 'react';
import invariant from 'tiny-invariant';

import { usePreloadedImages, type ImgSrcMap } from '../utils/preload';

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
    invariant(context, 'useImages must be used with ImagesProvider');
    return context;
};

type Props = {
    imgSrcs: string[];
    children: ReactNode;
};

function ImagesProvider({ imgSrcs, children }: Props) {
    const contextValue = usePreloadedImages(imgSrcs);
    return <ImageContext.Provider value={contextValue}>{children}</ImageContext.Provider>;
}

export default ImagesProvider;
