'use client';
import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  uid: string;
  label: string;
}

export default function CopyUidButton({ uid, label }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(uid);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // best-effort — clipboard may be blocked in some contexts
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-separator text-text-secondary hover:bg-separator/80 transition font-mono"
      aria-label={label}
      title={uid}
    >
      {copied ? (
        <>
          <Check size={11} aria-hidden /> {uid.slice(0, 8)}…
        </>
      ) : (
        <>
          <Copy size={11} aria-hidden /> {uid.slice(0, 8)}…
        </>
      )}
    </button>
  );
}
