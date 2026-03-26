import { useEffect, useRef } from 'react';
import { WebSocketManager } from '../services/websocket';
import { useStore } from '../store/useStore';
import { toast } from 'sonner';

const NOTIFICATION_WS_URL = (import.meta.env.VITE_NOTIFICATION_SERVICE_URL || 'http://localhost:3004')
  .replace(/\/api$/, '')
  .replace(/^http/, 'ws') + '/ws';

export function useNotificationSocket() {
  const managerRef = useRef<WebSocketManager | null>(null);
  const { isAuthenticated, setWsConnected } = useStore();

  useEffect(() => {
    const token = localStorage.getItem('shopnova-token');
    if (!isAuthenticated || !token) {
      return;
    }

    const manager = new WebSocketManager(NOTIFICATION_WS_URL);
    managerRef.current = manager;

    const unsubStatus = manager.onStatusChange((status) => {
      setWsConnected('notification', status === 'connected');
    });

    manager.on('push_notification', (data) => {
      const raw = data.notification as Record<string, unknown> | undefined;
      if (!raw) return;

      const store = useStore.getState();
      const notification = {
        id: String(raw.id || `notif-ws-${Date.now()}`),
        userId: store.currentUser?.id || '',
        type: (raw.type as 'order' | 'promo' | 'system') || 'system',
        title: String(raw.title || ''),
        message: String(raw.message || ''),
        read: false,
        createdAt: String(raw.createdAt || new Date().toISOString()),
      };

      store.addNotification(notification);

      toast(notification.title, {
        description: notification.message,
      });
    });

    manager.connect(token);

    return () => {
      unsubStatus();
      manager.disconnect();
      managerRef.current = null;
    };
  }, [isAuthenticated, setWsConnected]);

  return managerRef.current;
}
