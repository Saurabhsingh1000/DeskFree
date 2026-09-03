import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { NotFoundError } from '../middleware/errorHandler';

const router = Router();

const roomQuerySchema = z.object({
  startTime: z.string().datetime({ message: 'Invalid startTime' }).optional(),
  endTime: z.string().datetime({ message: 'Invalid endTime' }).optional(),
  type: z.enum(['QUIET_ROOM', 'GROUP_ROOM', 'OPEN_SEATING']).optional(),
});

// GET /api/rooms — list all rooms with live available seat count
const listRooms: RequestHandler = async (req, res, next) => {
  try {
    const { startTime, endTime, type } = roomQuerySchema.parse(req.query);

    const rooms = await prisma.room.findMany({
      where: type ? { type } : undefined,
      include: {
        seats: {
          where: { isActive: true },
          include: {
            bookings: startTime && endTime
              ? {
                  where: {
                    status: 'CONFIRMED',
                    startTime: { lt: new Date(endTime) },
                    endTime: { gt: new Date(startTime) },
                  },
                }
              : { where: { status: 'CONFIRMED' } },
          },
        },
      },
      orderBy: [{ floor: 'asc' }, { name: 'asc' }],
    });

    const result = rooms.map((room) => {
      const totalActiveSeats = room.seats.length;
      const bookedSeats = room.seats.filter((s) => s.bookings.length > 0).length;
      return {
        id: room.id,
        name: room.name,
        floor: room.floor,
        capacity: room.capacity,
        type: room.type,
        totalActiveSeats,
        availableSeats: totalActiveSeats - bookedSeats,
        createdAt: room.createdAt,
      };
    });

    res.json({ rooms: result });
  } catch (err) {
    next(err);
  }
};

// GET /api/rooms/:id — room detail with seats and their booking status
const getRoom: RequestHandler = async (req, res, next) => {
  try {
    const { startTime, endTime } = roomQuerySchema.parse(req.query);

    const room = await prisma.room.findUnique({
      where: { id: req.params.id },
      include: {
        seats: {
          include: {
            bookings: startTime && endTime
              ? {
                  where: {
                    status: 'CONFIRMED',
                    startTime: { lt: new Date(endTime) },
                    endTime: { gt: new Date(startTime) },
                  },
                  include: { user: { select: { id: true, name: true } } },
                }
              : false,
          },
          orderBy: { seatNumber: 'asc' },
        },
      },
    });

    if (!room) {
      throw new NotFoundError('Room not found.');
    }

    const seats = room.seats.map((seat) => ({
      id: seat.id,
      seatNumber: seat.seatNumber,
      isActive: seat.isActive,
      status: !seat.isActive
        ? 'MAINTENANCE'
        : seat.bookings && seat.bookings.length > 0
        ? 'BOOKED'
        : 'AVAILABLE',
      booking: seat.bookings && seat.bookings.length > 0 ? seat.bookings[0] : null,
    }));

    res.json({
      room: {
        id: room.id,
        name: room.name,
        floor: room.floor,
        capacity: room.capacity,
        type: room.type,
        seats,
      },
    });
  } catch (err) {
    next(err);
  }
};

router.get('/', listRooms);
router.get('/:id', getRoom);

export default router;
