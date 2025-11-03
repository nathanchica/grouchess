import { describe, it, expect } from 'vitest';

import { createMockChessClockState } from '../clocks.js';

describe('createMockChessClockState', () => {
    it('should create default clock state with 10 minutes', () => {
        const clock = createMockChessClockState();

        expect(clock).toEqual({
            white: {
                timeRemainingMs: 600000, // 10 minutes
                isActive: false,
            },
            black: {
                timeRemainingMs: 600000, // 10 minutes
                isActive: false,
            },
            lastUpdatedTimeMs: null,
            baseTimeMs: 600000,
            incrementMs: 0,
            isPaused: false,
        });
    });

    it('should apply custom base time and increment', () => {
        const clock = createMockChessClockState({
            baseTimeMs: 180000, // 3 minutes
            incrementMs: 2000, // 2 seconds
        });

        expect(clock.baseTimeMs).toBe(180000);
        expect(clock.incrementMs).toBe(2000);
        expect(clock.white.timeRemainingMs).toBe(180000);
        expect(clock.black.timeRemainingMs).toBe(180000);
    });

    it('should apply custom white player state', () => {
        const clock = createMockChessClockState({
            white: {
                timeRemainingMs: 450000,
                isActive: true,
            },
        });

        expect(clock.white.timeRemainingMs).toBe(450000);
        expect(clock.white.isActive).toBe(true);
        expect(clock.black.isActive).toBe(false);
    });

    it('should apply custom black player state', () => {
        const clock = createMockChessClockState({
            black: {
                timeRemainingMs: 300000,
                isActive: true,
            },
        });

        expect(clock.black.timeRemainingMs).toBe(300000);
        expect(clock.black.isActive).toBe(true);
        expect(clock.white.isActive).toBe(false);
    });

    it('should set lastUpdatedTimeMs when provided', () => {
        const timestamp = Date.now();
        const clock = createMockChessClockState({
            lastUpdatedTimeMs: timestamp,
        });

        expect(clock.lastUpdatedTimeMs).toBe(timestamp);
    });

    it('should set isPaused when provided', () => {
        const clock = createMockChessClockState({
            isPaused: true,
        });

        expect(clock.isPaused).toBe(true);
    });

    it('should handle partial white state overrides', () => {
        const clock = createMockChessClockState({
            white: {
                isActive: true,
                timeRemainingMs: 600000,
            },
        });

        expect(clock.white.isActive).toBe(true);
        expect(clock.white.timeRemainingMs).toBe(600000);
    });

    it('should handle partial black state overrides', () => {
        const clock = createMockChessClockState({
            black: {
                timeRemainingMs: 100000,
                isActive: false,
            },
        });

        expect(clock.black.timeRemainingMs).toBe(100000);
        expect(clock.black.isActive).toBe(false);
    });

    it('should create blitz time control (3+2)', () => {
        const clock = createMockChessClockState({
            baseTimeMs: 180000, // 3 minutes
            incrementMs: 2000, // 2 seconds
        });

        expect(clock.baseTimeMs).toBe(180000);
        expect(clock.incrementMs).toBe(2000);
    });

    it('should create rapid time control (10+0)', () => {
        const clock = createMockChessClockState({
            baseTimeMs: 600000, // 10 minutes
            incrementMs: 0,
        });

        expect(clock.baseTimeMs).toBe(600000);
        expect(clock.incrementMs).toBe(0);
    });

    it('should create bullet time control (1+0)', () => {
        const clock = createMockChessClockState({
            baseTimeMs: 60000, // 1 minute
            incrementMs: 0,
        });

        expect(clock.baseTimeMs).toBe(60000);
        expect(clock.incrementMs).toBe(0);
    });

    it('should create mid-game state with different times', () => {
        const clock = createMockChessClockState({
            baseTimeMs: 600000,
            incrementMs: 0,
            white: {
                timeRemainingMs: 450000,
                isActive: false,
            },
            black: {
                timeRemainingMs: 380000,
                isActive: true,
            },
            lastUpdatedTimeMs: Date.now(),
        });

        expect(clock.white.timeRemainingMs).toBe(450000);
        expect(clock.black.timeRemainingMs).toBe(380000);
        expect(clock.black.isActive).toBe(true);
        expect(clock.lastUpdatedTimeMs).not.toBeNull();
    });
});
