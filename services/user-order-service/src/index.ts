import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import Redis from 'ioredis';
import { initializeDatabase } from './shared/database';
import { app } from './app';

const server = http.createServer(app);
const PORT = process.env.PORT || 3001;
const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

// WebSocket server for real-time order updates
const wss = new WebSocketServer({ server });

// Redis client for caching and streams
const redis = new Redis(REDIS_URL);

// Track active WebSocket connections by user ID
const userConnections = new Map<number, Set<WebSocket>>();

// WebSocket connection for real-time updates
wss.on('connection', (ws: WebSocket) => {

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);

      // Handle different message types
      if (data.type === 'subscribe') {
        // Subscribe to user-specific updates
        if (data.userId) {
          const userId = data.userId;
          (ws as any).userId = userId;

          // Add connection to user's connection set
          if (!userConnections.has(userId)) {
            userConnections.set(userId, new Set());
          }
          userConnections.get(userId)!.add(ws);

          // Send confirmation
          ws.send(JSON.stringify({
            type: 'subscribed',
            userId,
            timestamp: new Date().toISOString()
          }));
        }
      } else if (data.type === 'ping') {
        // Respond to ping to keep connection alive
        ws.send(JSON.stringify({ type: 'pong', timestamp: new Date().toISOString() }));
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    const userId = (ws as any).userId;
    if (userId && userConnections.has(userId)) {
      userConnections.get(userId)!.delete(ws);
      if (userConnections.get(userId)!.size === 0) {
        userConnections.delete(userId);
      }
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Redis Streams setup for event publishing
const initializeRedisStreams = async () => {
  try {
    // Create consumer groups if they don't exist
    try {
      await redis.xgroup('CREATE', 'user_events', 'notification_group', '0', 'MKSTREAM');
    } catch (error) {
      // Group already exists
    }

    try {
      await redis.xgroup('CREATE', 'order_events', 'notification_group', '0', 'MKSTREAM');
    } catch (error) {
      // Group already exists
    }
  } catch (error) {
    console.error('Redis Streams initialization error:', error);
  }
};

// Helper function to publish events to Redis Streams
export const publishEvent = async (eventType: string, data: any) => {
  try {
    const streamName = eventType.startsWith('user') ? 'user_events' : 'order_events';
    await redis.xadd(
      streamName,
      '*',
      'event', eventType,
      'data', JSON.stringify(data),
      'timestamp', new Date().toISOString()
    );
  } catch (error) {
    console.error('Failed to publish event:', error);
  }
};

// Helper function to send real-time updates to a specific user via WebSocket
export const broadcastToUser = (userId: number, data: any) => {
  if (userConnections.has(userId)) {
    userConnections.get(userId)!.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  }
};

// Helper function to broadcast updates to all connected clients
export const broadcastToAll = (data: any) => {
  userConnections.forEach((connections) => {
    connections.forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(data));
      }
    });
  });
};

// Start server
const startServer = async () => {
  try {
    // Initialize database
    await initializeDatabase();

    // Initialize Redis Streams
    await initializeRedisStreams();

    // Start HTTP server
    server.listen(PORT, () => {
      console.log(`🚀 User-Order Service running on port ${PORT}`);
      console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🔌 WebSocket server ready for real-time updates`);
      console.log(`🌊 Redis Streams ready for event publishing`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully');
  server.close(() => {
    redis.disconnect();
    process.exit(0);
  });
});

// Only start server if not in test mode
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Export app and redis for testing and other modules
export { app, redis };
