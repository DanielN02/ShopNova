import { useEffect, useRef } from 'react';
import { WebSocketManager } from '../services/websocket';
import { useStore } from '../store/useStore';

const ORDER_WS_URL = (import.meta.env.VITE_ORDER_SERVICE_URL || 'http://localhost:3003')
  .replace(/\/api$/, '')
  .replace(/^http/, 'ws') + '/ws';

export function useOrderSocket() {
  const managerRef = useRef<WebSocketManager | null>(null);
  const { isAuthenticated, setWsConnected } = useStore();

  useEffect(() => {
    const token = localStorage.getItem('shopnova-token');
    if (!isAuthenticated || !token) {
      return;
    }

    const manager = new WebSocketManager(ORDER_WS_URL);
    managerRef.current = manager;

    const unsubStatus = manager.onStatusChange((status) => {
      setWsConnected('order', status === 'connected');
    });

    manager.on('order_update', (data) => {
      const store = useStore.getState();
      // Add a notification for the order update
      const notification = {
        id: `order-ws-${Date.now()}`,
        userId: store.currentUser?.id || '',
        type: 'order' as const,
        title: `Order ${(data.status as string) === 'cancelled' ? 'Cancelled' : 'Update'}`,
        message: (data.message as string) || `Order status changed to ${data.status as string}`,
        read: false,
        createdAt: new Date().toISOString(),
      };
      store.addNotification(notification);
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
