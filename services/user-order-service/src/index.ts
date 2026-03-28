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

// WebSocket connection for real-time updates
wss.on('connection', (ws: WebSocket) => {
  console.log('WebSocket client connected');

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      
      // Handle different message types
      if (data.type === 'subscribe') {
        // Subscribe to user-specific updates
        if (data.userId) {
          // Store connection with user ID for targeted updates
          (ws as any).userId = data.userId;
          console.log(`User ${data.userId} subscribed to real-time updates`);
        }
      }
    } catch (error) {
      console.error('WebSocket message error:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket client disconnected');
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Redis Streams setup for event publishing
const initializeRedisStreams = async () => {
  try {
    console.log('🔍 User-Order Service connecting to Redis:', REDIS_URL.replace(/:[^:]*@/, ':****@')); // Hide password
    
    // Create consumer groups if they don't exist
    try {
      await redis.xgroup('CREATE', 'user_events', 'notification_group', '0', 'MKSTREAM');
      console.log('User events consumer group created');
    } catch (error) {
      // Group already exists
      console.log('User events consumer group already exists');
    }

    try {
      await redis.xgroup('CREATE', 'order_events', 'notification_group', '0', 'MKSTREAM');
      console.log('Order events consumer group created');
    } catch (error) {
      // Group already exists
      console.log('Order events consumer group already exists');
    }

    console.log('Redis Streams initialized successfully');
  } catch (error) {
    console.error('Redis Streams initialization error:', error);
  }
};

// Helper function to publish events to Redis Streams
export const publishEvent = async (streamName: string, eventType: string, data: any) => {
  try {
    await redis.xadd(
      streamName,
      '*',
      'event_type', eventType,
      'data', JSON.stringify(data),
      'timestamp', new Date().toISOString()
    );
    console.log(`📤 Event published: ${eventType} to ${streamName}`);
  } catch (error) {
    console.error('❌ Failed to publish event:', error);
  }
};

// Helper function to send real-time updates via WebSocket
export const sendRealTimeUpdate = (userId: number, data: any) => {
  wss.clients.forEach((client) => {
    if ((client as any).userId === userId && client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
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

// Export app for testing
export { app };
