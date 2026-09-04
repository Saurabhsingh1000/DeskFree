import { Server as HttpServer } from 'http';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '../lib/jwt';

let io: Server;

export function getIO(): Server {
  if (!io) {
    throw new Error('Socket.io has not been initialized. Call initSocket() first.');
  }
  return io;
}

export function initSocket(httpServer: HttpServer): Server {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*'
        ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
        : '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Optional: authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token as string | undefined;
    if (token) {
      try {
        const payload = verifyToken(token);
        socket.data.userId = payload.userId;
        socket.data.role = payload.role;
      } catch {
        // Token invalid — allow unauthenticated socket (read-only live updates)
      }
    }
    next();
  });

  io.on('connection', (socket: Socket) => {
    const userId = socket.data.userId as string | undefined;

    // Join a personal room for admin-cancellation notifications
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // CLIENT → SERVER: join a library room to receive live seat updates
    socket.on('join-room', (roomId: string) => {
      if (typeof roomId !== 'string') return;
      socket.join(`room:${roomId}`);
    });

    // CLIENT → SERVER: leave a library room
    socket.on('leave-room', (roomId: string) => {
      if (typeof roomId !== 'string') return;
      socket.leave(`room:${roomId}`);
    });

    socket.on('disconnect', () => {
      // Socket.io automatically cleans up room memberships on disconnect
    });
  });

  console.log('✅ Socket.io initialized');
  return io;
}
