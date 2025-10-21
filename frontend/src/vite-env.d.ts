/// <reference types="vite/client" />
/// <reference types="vite-plugin-svgr/client" />

declare module '*.svg' {
    const content: string;
    export default content;
}

declare module '*.css' {
    const content: Record<string, string>;
    export default content;
}

declare module '*.css';
declare module '@fontsource/*' {}
declare module '@fontsource-variable/*' {}
