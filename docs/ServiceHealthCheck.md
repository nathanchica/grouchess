# Service Health Check (Suspense + lazy)

This documents the initial health‑check and lazy‑loading flow for the main menu route. The goal is to avoid rendering the "waking up" screen when the backend is already healthy, and only download that UI when needed.

## Goals

- Run a fast, one‑shot health probe before rendering the root view.
- If healthy: render `GameRoomForm` immediately (no extra UI).
- If unhealthy/timeout: lazy‑load `ServiceHealthCheckView`, which polls until healthy.
- Keep polling logic encapsulated in `ServiceHealthCheckView` via `useFetchServiceHealth`.

## High‑Level Flow

1. `MainMenuView` wraps the routes in `Suspense` with a `null` fallback.
2. `GameRoomFormHealthGate` kicks off a one‑shot probe using `checkHealthStatus()` and awaits it with React 19's `use()`.
3. If the probe resolves `true`, `GameRoomFormHealthGate` renders `GameRoomForm`.
4. If the probe resolves `false`, `GameRoomFormHealthGate` renders a lazily imported `ServiceHealthCheckView`.
5. `ServiceHealthCheckView` uses `useFetchServiceHealth` to poll and, once healthy, calls `onHealthy()`.
   `GameRoomFormHealthGate` then renders `GameRoomForm`.

This ensures the normal path is instant and small, while the wake‑up UI is code‑split and only fetched on failure.

## Files

- `frontend/src/utils/health.ts` — `fetchParsedHealthStatus` (typed one‑shot health request) and `checkHealthStatus` (boolean).
- `frontend/src/components/mainmenu/GameRoomFormHealthGate.tsx` — probes once and branches UI; lazy‑loads the fallback.
- `frontend/src/components/views/MainMenuView.tsx` — wraps the root route element with `Suspense` and renders `GameRoomFormHealthGate`.
- `frontend/src/components/mainmenu/ServiceHealthCheckView.tsx` — polling view using `useFetchServiceHealth`, invokes `onHealthy()` when ready.

## `fetchParsedHealthStatus` and `checkHealthStatus`

`fetchParsedHealthStatus` performs a single, typed request to the backend health endpoint and either returns parsed data or throws a typed error. `checkHealthStatus` fetches once and returns a boolean indicating health.

## `GameRoomFormHealthGate`

Probes once, then decides which view to render. `ServiceHealthCheckView` is lazy‑loaded to keep the main bundle small.

```tsx
// frontend/src/components/mainmenu/GameRoomFormHealthGate.tsx
import { lazy, use, useState } from 'react';
import type { TimeControl } from '@grouchess/game-room';
import { checkHealthStatus } from '../../utils/health';
import GameRoomForm from './GameRoomForm';

const LazyServiceHealthCheckView = lazy(() => import('./ServiceHealthCheckView'));

/**
 * Represents the active health check probe promise.
 * This ensures that multiple mounts of the health gate share the same probe instead of creating multiple probes.
 */
let activeProbe: Promise<boolean> | null = null;

type Props = { onSelfPlayStart: (t: TimeControl | null) => void };

export default function GameRoomFormHealthGate({ onSelfPlayStart }: Props) {
    const initiallyHealthy = use((activeProbe ??= checkHealthStatus()));
    const [isHealthy, setIsHealthy] = useState(initiallyHealthy);
    return isHealthy ? (
        <GameRoomForm onSelfPlayStart={onSelfPlayStart} />
    ) : (
        <LazyServiceHealthCheckView onHealthy={() => setIsHealthy(true)} />
    );
}
```

## `ServiceHealthCheckView` (callback-based)

It polls and calls `onHealthy()` so the parent (`GameRoomFormHealthGate`) can switch views, keeping rendering responsibility centralized.

```tsx
// frontend/src/components/mainmenu/ServiceHealthCheckView.tsx
type Props = { onHealthy: () => void };

function ServiceHealthCheckView({ onHealthy }: Props) {
    const { fetchHealthStatus, error } = useFetchServiceHealth();
    const [isHealthy, setIsHealthy] = useState(false);
    // ... polling counters and effects
    useEffect(() => {
        if (isHealthy) onHealthy();
    }, [isHealthy, onHealthy]);
    if (isHealthy) return null; // parent will swap to GameRoomForm
    return <LoadingPanel />;
}
```

## Router Integration

Wrap the root route with `Suspense` and render `GameRoomFormHealthGate`.

```tsx
// frontend/src/components/views/MainMenuView.tsx
import { Suspense, lazy } from 'react';
import { Routes, Route } from 'react-router';

const WaitingRoomView = lazy(() => import('../mainmenu/WaitingRoomView'));
const GameRoomFormHealthGate = lazy(() => import('../mainmenu/GameRoomFormHealthGate'));

// ... inside the component render
<Suspense fallback={null}>
    <Routes>
        <Route path="/:roomId" element={<WaitingRoomView />} />
        <Route path="/" element={<GameRoomFormHealthGate onSelfPlayStart={onSelfPlayStart} />} />
    </Routes>
    {/* other routes ... */}
</Suspense>;
```
