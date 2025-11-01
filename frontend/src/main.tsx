import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import * as Sentry from '@sentry/react';
import { ErrorBoundary } from 'react-error-boundary';
import { BrowserRouter } from 'react-router';

import '@fontsource-variable/merriweather';
import '@fontsource-variable/playfair-display';

import './index.css';
import App from './App';
import AppErrorView from './components/views/AppErrorView';

if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        integrations: [Sentry.browserTracingIntegration()],
        environment: import.meta.env.MODE,
        tracesSampleRate: parseFloat(import.meta.env.VITE_SENTRY_TRACES_SAMPLE_RATE ?? '0.1'),
    });
}

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <BrowserRouter>
            <ErrorBoundary fallbackRender={AppErrorView}>
                <App />
            </ErrorBoundary>
        </BrowserRouter>
    </StrictMode>
);
