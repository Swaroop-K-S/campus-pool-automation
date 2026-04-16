import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// ── Service Worker Registration ────────────────────────────────────────
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const reg = await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      console.log('[PWA] Service worker registered:', reg.scope);

      // Notify the app when a new SW is waiting to activate
      reg.addEventListener('updatefound', () => {
        const newWorker = reg.installing;
        if (!newWorker) return;
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // Post a message so the app can show a "New version available" toast
            window.dispatchEvent(new CustomEvent('sw:update-available'));
          }
        });
      });
    } catch (err) {
      console.warn('[PWA] Service worker registration failed:', err);
    }
  });
}

// ── Online/Offline Event Bridge ────────────────────────────────────────
window.addEventListener('online',  () => window.dispatchEvent(new CustomEvent('app:online')));
window.addEventListener('offline', () => window.dispatchEvent(new CustomEvent('app:offline')));
