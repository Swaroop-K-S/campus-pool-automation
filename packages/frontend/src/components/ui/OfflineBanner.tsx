import React from 'react';
import { useOnlineStatus } from '../../hooks/use-online-status';

/**
 * OfflineBanner
 *
 * A fixed-top sticky banner that slides into view whenever the browser
 * loses its network connection. It uses only the lightweight `useOnlineStatus`
 * hook — no Zustand store required — making it safe to drop into any page.
 *
 * Design tokens mirror the project's existing amber/warning palette.
 * The banner unmounts completely when online to avoid any layout impact.
 */
export const OfflineBanner: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div
      role="alert"
      aria-live="assertive"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        background: 'linear-gradient(90deg, #d97706 0%, #b45309 100%)',
        color: '#fff',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px',
        fontSize: '13px',
        fontWeight: 600,
        letterSpacing: '0.01em',
        boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
        animation: 'slideDown 0.3s ease-out',
      }}
    >
      {/* Pulsing dot */}
      <span
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#fef3c7',
          flexShrink: 0,
          animation: 'pulse 1.5s infinite',
          display: 'inline-block',
        }}
      />

      {/* Message */}
      <span>
        You are offline.{' '}
        <strong style={{ fontWeight: 700 }}>CampusPool is saving your changes locally</strong>{' '}
        and will sync automatically when reconnected.
      </span>

      {/* Icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ opacity: 0.8, flexShrink: 0 }}
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

      {/* Inline keyframes via a style tag — avoids Tailwind dependency */}
      <style>{`
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);    opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1;   transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(1.3); }
        }
      `}</style>
    </div>
  );
};
