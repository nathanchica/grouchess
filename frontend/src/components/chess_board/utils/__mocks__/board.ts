export function createMockDOMRect(width: number, height: number): DOMRect {
    return {
        width,
        height,
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        bottom: height,
        right: width,
        toJSON: () => ({}),
    } as DOMRect;
}
