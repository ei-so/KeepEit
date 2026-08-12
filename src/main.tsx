import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Register Service Worker for PWA offline shell capability after first paint
if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // If a waiting worker exists already
        if (registration.waiting) {
          window.dispatchEvent(
            new CustomEvent('keepeit_sw_update_ready', {
              detail: { waitingWorker: registration.waiting },
            })
          );
        }

        // Listen for new worker installed and waiting
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                window.dispatchEvent(
                  new CustomEvent('keepeit_sw_update_ready', {
                    detail: { waitingWorker: newWorker },
                  })
                );
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('Service worker registration failed:', err);
      });
  });
}

