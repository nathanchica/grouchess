import { StrictMode } from 'react';

import { createRoot } from 'react-dom/client';

import '@fontsource-variable/merriweather';
import '@fontsource-variable/playfair-display';

import './index.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App />
    </StrictMode>
);
