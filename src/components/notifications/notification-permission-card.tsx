'use client';

import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/button';

type PermissionState = 'default' | 'granted' | 'denied' | 'unsupported';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

export function NotificationPermissionCard({ publicKey }: { publicKey?: string }) {
  const [permission, setPermission] = useState<PermissionState>('default');
  const [message, setMessage] = useState('');
  const canSubscribe = useMemo(() => Boolean(publicKey), [publicKey]);

  useEffect(() => {
    if (!('Notification' in window) || !('serviceWorker' in navigator) || !('PushManager' in window)) {
      setPermission('unsupported');
      return;
    }

    setPermission(Notification.permission as PermissionState);
  }, []);

  async function enableNotifications() {
    setMessage('Preparing notifications...');

    if (!canSubscribe) {
      setMessage('Notifications need a VAPID public key before they can be enabled.');
      return;
    }

    const nextPermission = await Notification.requestPermission();
    setPermission(nextPermission as PermissionState);

    if (nextPermission !== 'granted') {
      setMessage('Notifications were not enabled. You can change this in your browser settings.');
      return;
    }

    const registration = await navigator.serviceWorker.register('/sw.js');
    const existing = await registration.pushManager.getSubscription();
    const subscription = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey!)
    });

    const response = await fetch('/api/notifications/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(subscription.toJSON())
    });

    if (!response.ok) {
      setMessage('We could not save this device yet. Please try again.');
      return;
    }

    setMessage('Notifications are enabled for this device.');
  }

  return (
    <div className="rounded-[1.5rem] bg-gradient-to-br from-rose-500 to-fuchsia-500 p-5 text-white">
      <p className="text-sm font-bold uppercase tracking-[0.22em] text-white/75">PWA push</p>
      <h2 className="mt-2 text-2xl font-black">Stay gently connected</h2>
      <p className="mt-2 text-sm leading-6 text-white/90">Enable reminders only after pairing, so OurStory can nudge you about questions, partner answers, memories, date ideas, and streaks.</p>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="secondary" onClick={enableNotifications} disabled={permission === 'unsupported' || permission === 'denied'}>
          {permission === 'granted' ? 'Refresh device subscription' : 'Enable notifications'}
        </Button>
        <span className="text-sm font-semibold text-white/85">Status: {permission}</span>
      </div>
      {message ? <p className="mt-4 rounded-2xl bg-white/15 p-3 text-sm text-white">{message}</p> : null}
    </div>
  );
}
