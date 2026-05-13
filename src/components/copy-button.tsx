'use client';

import { useState } from 'react';
import { Button } from '@/components/button';

export function CopyButton({ value, label = 'Copy invite code' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <Button type="button" variant="secondary" onClick={copy} className="w-full sm:w-auto">
      {copied ? 'Copied!' : label}
    </Button>
  );
}
