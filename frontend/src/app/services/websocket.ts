type EventHandler = (data: Record<string, unknown>) => void;

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected';

export class WebSocketManager {
  private ws: WebSocket | null = null;
  private url: string;
  private handlers = new Map<string, Set<EventHandler>>();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionalClose = false;
  private _status: ConnectionStatus = 'disconnected';
  private statusListeners = new Set<(status: ConnectionStatus) => void>();

  constructor(url: string) {
    this.url = url;
  }

  get status(): ConnectionStatus {
    return this._status;
  }

  private setStatus(status: ConnectionStatus) {
    this._status = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  onStatusChange(fn: (status: ConnectionStatus) => void): () => void {
    this.statusListeners.add(fn);
    return () => {
      this.statusListeners.delete(fn);
    };
  }

  connect(token: string): void {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.intentionalClose = false;
    this.setStatus('connecting');

    const separator = this.url.includes('?') ? '&' : '?';
    const wsUrl = `${this.url}${separator}token=${encodeURIComponent(token)}`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      this.setStatus('disconnected');
      this.scheduleReconnect(token);
      return;
    }

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string) as Record<string, unknown>;
        const type = data.type as string | undefined;
        if (type) {
          const typeHandlers = this.handlers.get(type);
          if (typeHandlers) {
            typeHandlers.forEach((handler) => handler(data));
          }
        }
        // Also fire wildcard handlers
        const wildcardHandlers = this.handlers.get('*');
        if (wildcardHandlers) {
          wildcardHandlers.forEach((handler) => handler(data));
        }
      } catch {
        // Ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.setStatus('disconnected');
      if (!this.intentionalClose) {
        this.scheduleReconnect(token);
      }
    };

    this.ws.onerror = () => {
      // onclose will fire after onerror, so reconnect is handled there
    };
  }

  disconnect(): void {
    this.intentionalClose = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.setStatus('disconnected');
  }

  on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: string, handler: EventHandler): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
      if (eventHandlers.size === 0) {
        this.handlers.delete(event);
      }
    }
  }

  private scheduleReconnect(token: string): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      return;
    }

    // Exponential backoff: 1s, 2s, 4s, 8s, 16s, capped at 30s
    const baseDelay = 1000;
    const delay = Math.min(baseDelay * Math.pow(2, this.reconnectAttempts), 30000);
    this.reconnectAttempts++;
    this.setStatus('connecting');

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect(token);
    }, delay);
  }
}
