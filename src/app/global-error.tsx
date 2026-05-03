'use client';
import { useEffect } from 'react';

// Catches errors thrown above the root layout (e.g., during root rendering).
// Must include its own <html> and <body> since this replaces the layout entirely.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error('[redeemy-admin] global error:', error);
  }, [error]);

  return (
    <html lang="he" dir="rtl">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          background: '#F0FDFA',
          color: '#0F172A',
          fontFamily: 'system-ui, sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px 16px',
        }}
      >
        <div
          style={{
            maxWidth: 420,
            width: '100%',
            background: '#fff',
            borderRadius: 12,
            padding: 24,
            textAlign: 'center',
            boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
          }}
        >
          <h1 style={{ margin: '0 0 8px', fontSize: 20 }}>משהו השתבש</h1>
          <p style={{ margin: '0 0 16px', fontSize: 14, color: '#757575' }}>
            התרחשה שגיאה קריטית. נסה שוב.
          </p>
          <button
            onClick={reset}
            style={{
              background: '#5F9E8F',
              color: '#fff',
              border: 'none',
              padding: '8px 18px',
              borderRadius: 8,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            נסה שוב
          </button>
        </div>
      </body>
    </html>
  );
}
