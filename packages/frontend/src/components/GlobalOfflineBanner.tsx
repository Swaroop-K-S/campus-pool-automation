import React, { useEffect } from 'react';
import { useOfflineSyncStore } from '../store/offline-sync.store';
import { useOnlineStatus } from '../hooks/use-online-status';

/**
 * GlobalOfflineBanner
 *
 * Fixed-top banner that:
 *  • Shows an amber "offline" strip when the browser loses connectivity.
 *  • Shows a teal "syncing" strip while flushing the IndexedDB queue on reconnection.
 *  • Disappears completely once online and the queue is empty.
 *
 * It derives `isOnline` from both the fast local hook (immediate browser event)
 * AND the Zustand store (which also triggers sync), so they stay in lockstep.
 */
export const GlobalOfflineBanner: React.FC = () => {
  const hookOnline = useOnlineStatus(); // fast, event-driven
  const { isOnline: storeOnline, queuedActionsCount, isSyncing, initSyncListener } =
    useOfflineSyncStore();

  // Bootstrap the IDB sync listener once at mount
  useEffect(() => {
    const cleanup = initSyncListener();
    return cleanup;
  }, [initSyncListener]);

  // Derive combined state — conservative AND of both
  const isOnline = hookOnline && storeOnline;

  // Fully hidden when online and nothing to sync
  if (isOnline && queuedActionsCount === 0 && !isSyncing) return null;

  // ── Syncing strip (online, draining queue) ──────────────────────────────
  if (isOnline && (isSyncing || queuedActionsCount > 0)) {
    return (
      <div
        role="status"
        aria-live="polite"
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0,
          zIndex: 99999,
          background: 'linear-gradient(90deg, #0d9488 0%, #0f766e 100%)',
          color: '#fff',
          padding: '9px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '10px',
          fontSize: '13px',
          fontWeight: 600,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
          animation: 'cpSlideDown 0.25s ease-out',
        }}
      >
        <span style={{ fontSize: 15 }}>♻️</span>
        <span>Connection restored — syncing your changes…</span>
        {queuedActionsCount > 0 && (
          <span
            style={{
              background: 'rgba(255,255,255,0.2)',
              borderRadius: 6,
              padding: '2px 8px',
              fontSize: 11,
              fontWeight: 700,
              letterSpacing: '0.05em',
            }}
          >
            {queuedActionsCount} PENDING
          </span>
        )}
        <CpKeyframes />
      </div>
    );
  }

  // ── Offline strip ───────────────────────────────────────────────────────
  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0, left: 0, right: 0,
        zIndex: 99999,
        background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
        color: '#fff',
        padding: '9px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 600,
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        animation: 'cpSlideDown 0.25s ease-out',
      }}
    >
      {/* Pulsing dot */}
      <span
        style={{
          width: 8, height: 8, borderRadius: '50%',
          background: '#fef3c7', flexShrink: 0,
          display: 'inline-block',
          animation: 'cpPulse 1.5s infinite',
        }}
      />

      <span>
        You are offline.{' '}
        <strong style={{ fontWeight: 700 }}>
          CampusPool is saving your changes locally
        </strong>{' '}
        and will sync automatically when reconnected.
      </span>

      {queuedActionsCount > 0 && (
        <span
          style={{
            background: 'rgba(255,255,255,0.2)',
            borderRadius: 6,
            padding: '2px 8px',
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.05em',
          }}
        >
          {queuedActionsCount} QUEUED
        </span>
      )}

      {/* No-wifi SVG */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="15" height="15"
        viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.5"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ opacity: 0.75, flexShrink: 0 }}
        aria-hidden="true"
      >
        <line x1="1" y1="1" x2="23" y2="23" />
        <path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" />
        <path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" />
        <path d="M10.71 5.05A16 16 0 0 1 22.56 9" />
        <path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" />
        <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
        <line x1="12" y1="20" x2="12.01" y2="20" />
      </svg>

      <CpKeyframes />
    </div>
  );
};

/** Injects shared keyframes once — avoids Tailwind @apply for these animations */
const CpKeyframes: React.FC = () => (
  <style>{`
    @keyframes cpSlideDown {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes cpPulse {
      0%, 100% { opacity: 1;   transform: scale(1);   }
      50%       { opacity: 0.4; transform: scale(1.35); }
    }
  `}</style>
);
