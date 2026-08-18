/**
 * Cross-browser web notifications helper for scheduled task reminders.
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    try {
      const perm = await Notification.requestPermission();
      return perm === 'granted';
    } catch (err) {
      console.warn('Notification permission request error:', err);
      return false;
    }
  }
  return false;
}

export function sendTaskNotification(title: string, body: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return;
  if (Notification.permission === 'granted') {
    try {
      new Notification(`KeepEit Reminder: ${title}`, {
        body: body || 'Your scheduled task is due now.',
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
      });
    } catch (e) {
      console.warn('Notification error:', e);
    }
  }
}
