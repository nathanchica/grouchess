import type { ClockTickContextType } from '../ClockTickProvider';

export function createMockClockTickContextValues(overrides?: Partial<ClockTickContextType>): ClockTickContextType {
    return {
        nowMs: 0,
        start: () => {},
        stop: () => {},
        isRunning: false,
        ...overrides,
    };
}
