import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { NotFoundError, AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

const router = Router();

// All admin routes require authentication + admin role
router.use(authenticate as RequestHandler);
router.use(requireAdmin as RequestHandler);

const createRoomSchema = z.object({
  name: z.string().min(2).max(100),
  floor: z.number().int().min(1).max(50),
  capacity: z.number().int().min(1).max(500),
  type: z.enum(['QUIET_ROOM', 'GROUP_ROOM', 'OPEN_SEATING']),
});

const updateRoomSchema = createRoomSchema.partial();

const createSeatSchema = z.object({
  roomId: z.string().min(1),
  seatNumber: z.string().min(1).max(20),
  isActive: z.boolean().optional().default(true),
});

const updateSeatSchema = z.object({
  seatNumber: z.string().min(1).max(20).optional(),
  isActive: z.boolean().optional(),
});

// ─── ROOM MANAGEMENT ──────────────────────────────────────────────────────────

// GET /api/admin/rooms
const adminListRooms: RequestHandler = async (_req, res, next) => {
  try {
    const rooms = await prisma.room.findMany({
      include: { _count: { select: { seats: true } } },
      orderBy: [{ floor: 'asc' }, { name: 'asc' }],
    });
    res.json({ rooms });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/rooms
const adminCreateRoom: RequestHandler = async (req, res, next) => {
  try {
    const data = createRoomSchema.parse(req.body);
    const room = await prisma.room.create({ data });
    res.status(201).json({ room });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/rooms/:id
const adminUpdateRoom: RequestHandler = async (req, res, next) => {
  try {
    const data = updateRoomSchema.parse(req.body);
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) throw new NotFoundError('Room not found.');

    const updated = await prisma.room.update({ where: { id: req.params.id }, data });
    res.json({ room: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/rooms/:id
const adminDeleteRoom: RequestHandler = async (req, res, next) => {
  try {
    const room = await prisma.room.findUnique({ where: { id: req.params.id } });
    if (!room) throw new NotFoundError('Room not found.');

    await prisma.room.delete({ where: { id: req.params.id } });
    res.json({ message: 'Room deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── SEAT MANAGEMENT ──────────────────────────────────────────────────────────

// POST /api/admin/seats
const adminCreateSeat: RequestHandler = async (req, res, next) => {
  try {
    const data = createSeatSchema.parse(req.body);

    const room = await prisma.room.findUnique({ where: { id: data.roomId } });
    if (!room) throw new NotFoundError('Room not found.');

    const seat = await prisma.seat.create({ data });
    res.status(201).json({ seat });
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/seats/:id
const adminUpdateSeat: RequestHandler = async (req, res, next) => {
  try {
    const data = updateSeatSchema.parse(req.body);

    const seat = await prisma.seat.findUnique({ where: { id: req.params.id } });
    if (!seat) throw new NotFoundError('Seat not found.');

    const updated = await prisma.seat.update({ where: { id: req.params.id }, data });

    // Broadcast seat status change if isActive changed
    if (data.isActive !== undefined) {
      const io = getIO();
      io.to(`room:${seat.roomId}`).emit('seat:update', {
        seatId: seat.id,
        roomId: seat.roomId,
        status: data.isActive ? 'AVAILABLE' : 'MAINTENANCE',
      });
    }

    res.json({ seat: updated });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/seats/:id
const adminDeleteSeat: RequestHandler = async (req, res, next) => {
  try {
    const seat = await prisma.seat.findUnique({ where: { id: req.params.id } });
    if (!seat) throw new NotFoundError('Seat not found.');

    await prisma.seat.delete({ where: { id: req.params.id } });

    const io = getIO();
    io.to(`room:${seat.roomId}`).emit('seat:deleted', { seatId: seat.id, roomId: seat.roomId });

    res.json({ message: 'Seat deleted successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── BOOKING MANAGEMENT ───────────────────────────────────────────────────────

// GET /api/admin/bookings
const adminListBookings: RequestHandler = async (req, res, next) => {
  try {
    const { status, userId, roomId } = req.query;

    const bookings = await prisma.booking.findMany({
      where: {
        ...(status ? { status: status as 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' } : {}),
        ...(userId ? { userId: userId as string } : {}),
        ...(roomId ? { seat: { roomId: roomId as string } } : {}),
      },
      include: {
        seat: { include: { room: { select: { id: true, name: true, floor: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { startTime: 'desc' },
    });

    res.json({ bookings });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/stats
const adminStats: RequestHandler = async (_req, res, next) => {
  try {
    const [totalUsers, totalRooms, totalSeats, totalBookings, activeBookings] = await Promise.all([
      prisma.user.count(),
      prisma.room.count(),
      prisma.seat.count({ where: { isActive: true } }),
      prisma.booking.count(),
      prisma.booking.count({ where: { status: 'CONFIRMED', endTime: { gt: new Date() } } }),
    ]);

    res.json({ stats: { totalUsers, totalRooms, totalSeats, totalBookings, activeBookings } });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/users
const adminListUsers: RequestHandler = async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { bookings: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ users });
  } catch (err) {
    next(err);
  }
};

router.get('/rooms', adminListRooms);
router.post('/rooms', adminCreateRoom);
router.put('/rooms/:id', adminUpdateRoom);
router.delete('/rooms/:id', adminDeleteRoom);

router.post('/seats', adminCreateSeat);
router.put('/seats/:id', adminUpdateSeat);
router.delete('/seats/:id', adminDeleteSeat);

router.get('/bookings', adminListBookings);
router.get('/stats', adminStats);
router.get('/users', adminListUsers);

export default router;
