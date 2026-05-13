'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function WaitingRefresh({ intervalMs = 5000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const interval = window.setInterval(() => router.refresh(), intervalMs);
    return () => window.clearInterval(interval);
  }, [intervalMs, router]);

  return <p className="text-xs font-bold uppercase tracking-[0.18em] text-rose-400">Refreshing every {Math.round(intervalMs / 1000)} seconds</p>;
}
