import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { initSocket } from './socket';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/auth';
import roomsRoutes from './routes/rooms';
import bookingsRoutes from './routes/bookings';
import adminRoutes from './routes/admin';

const app = express();
const httpServer = createServer(app);

// ─── Middleware ────────────────────────────────────────────────────────────────
app.use(
  cors({
    origin: process.env.FRONTEND_URL && process.env.FRONTEND_URL !== '*'
      ? process.env.FRONTEND_URL.split(',').map((u) => u.trim())
      : true,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);
app.use(express.json());
app.use(cookieParser());

// ─── Health check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Routes ───────────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes);
app.use('/api/rooms', roomsRoutes);
app.use('/api/bookings', bookingsRoutes);
app.use('/api/admin', adminRoutes);

// ─── 404 handler ──────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

// ─── Error handler (must be last) ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Socket.io ────────────────────────────────────────────────────────────────
initSocket(httpServer);

// ─── Start server (only if not running under test runner) ─────────────────────
const PORT = parseInt(process.env.PORT ?? '3001', 10);

if (process.env.NODE_ENV !== 'test') {
  httpServer.listen(PORT, async () => {
    console.log(`🚀 DeskFree backend running on http://localhost:${PORT}`);
    console.log(`📡 Socket.io enabled`);
    console.log(`🌍 CORS allowed for: ${process.env.FRONTEND_URL ?? 'http://localhost:5173'}`);

    try {
      const { autoSeedDatabase } = await import('./lib/seedHelper');
      const prisma = (await import('./lib/prisma')).default;
      await autoSeedDatabase(prisma);
    } catch (err) {
      console.warn('Auto-seed check note:', err);
    }
  });
}

export { app, httpServer };
