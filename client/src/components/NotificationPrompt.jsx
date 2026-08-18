import { useState, useEffect } from 'react';
import { getVapidPublicKey, subscribePush } from '../services/api';
import { BellIcon } from './Icons';

export default function NotificationPrompt() {
  const [show, setShow] = useState(false);
  const [subscribing, setSubscribing] = useState(false);

  useEffect(() => {
    // Check if notifications are supported and not yet granted
    if ('Notification' in window && 'serviceWorker' in navigator) {
      if (Notification.permission === 'default') {
        // Only show if user hasn't dismissed before
        const dismissed = localStorage.getItem('notif-prompt-dismissed');
        if (!dismissed) {
          setShow(true);
        }
      }
    }
  }, []);

  async function handleEnable() {
    setSubscribing(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        // Get VAPID public key
        const { publicKey } = await getVapidPublicKey();
        if (!publicKey) {
          console.warn('VAPID public key not configured');
          setShow(false);
          return;
        }

        // Register service worker if not already
        const registration = await navigator.serviceWorker.ready;

        // Subscribe to push
        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        });

        // Send subscription to server
        await subscribePush(subscription.toJSON());
        console.log('✅ Push notifications enabled');
      }
      setShow(false);
    } catch (err) {
      console.error('Push subscription error:', err);
    } finally {
      setSubscribing(false);
    }
  }

  function handleDismiss() {
    setShow(false);
    localStorage.setItem('notif-prompt-dismissed', 'true');
  }

  if (!show) return null;

  return (
    <div className="notification-prompt" id="notification-prompt">
      <BellIcon size={24} className="notification-prompt-icon" style={{ color: 'var(--primary)', flexShrink: 0 }} />
      <div className="notification-prompt-text">
        <h4>Enable Notifications</h4>
        <p>Get reminders for upcoming and overdue tasks</p>
      </div>
      <div className="notification-prompt-actions">
        <button className="btn btn-ghost btn-sm" onClick={handleDismiss}>
          Later
        </button>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleEnable}
          disabled={subscribing}
        >
          {subscribing ? '...' : 'Enable'}
        </button>
      </div>
    </div>
  );
}

// Helper: convert VAPID key to Uint8Array
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}
