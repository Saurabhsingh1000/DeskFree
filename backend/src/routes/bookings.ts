import { Router, RequestHandler } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireAdmin, AuthRequest } from '../middleware/auth';
import { ConflictError, NotFoundError, AppError } from '../middleware/errorHandler';
import { getIO } from '../socket';

const router = Router();

const MAX_BOOKING_HOURS = 3;

const createBookingSchema = z.object({
  seatId: z.string().min(1, 'Seat ID is required'),
  startTime: z.string().datetime({ message: 'Invalid startTime — use ISO 8601 format' }),
  endTime: z.string().datetime({ message: 'Invalid endTime — use ISO 8601 format' }),
});

// GET /api/bookings/mine — user's own bookings
const getMyBookings: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const userId = req.user!.userId;
    const now = new Date();

    const bookings = await prisma.booking.findMany({
      where: { userId },
      include: {
        seat: {
          include: { room: { select: { id: true, name: true, floor: true, type: true } } },
        },
      },
      orderBy: { startTime: 'asc' },
    });

    const upcoming = bookings.filter(
      (b) => b.status === 'CONFIRMED' && new Date(b.endTime) > now
    );
    const past = bookings.filter(
      (b) => b.status !== 'CONFIRMED' || new Date(b.endTime) <= now
    );

    res.json({ upcoming, past });
  } catch (err) {
    next(err);
  }
};

// POST /api/bookings — create booking with race-condition safety
const createBooking: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const { seatId, startTime: startTimeStr, endTime: endTimeStr } = createBookingSchema.parse(req.body);
    const userId = req.user!.userId;
    const startTime = new Date(startTimeStr);
    const endTime = new Date(endTimeStr);
    const now = new Date();

    // Validate: no past bookings
    if (startTime <= now) {
      throw new AppError(400, 'Cannot book a seat in the past. Please select a future time slot.');
    }

    // Validate: endTime > startTime
    if (endTime <= startTime) {
      throw new AppError(400, 'End time must be after start time.');
    }

    // Validate: max 3-hour duration
    const durationHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    if (durationHours > MAX_BOOKING_HOURS) {
      throw new AppError(400, `Bookings cannot exceed ${MAX_BOOKING_HOURS} hours.`);
    }

    // Validate: seat exists and is active
    const seat = await prisma.seat.findUnique({
      where: { id: seatId },
      include: { room: true },
    });

    if (!seat) {
      throw new NotFoundError('Seat not found.');
    }

    if (!seat.isActive) {
      throw new AppError(400, 'This seat is currently under maintenance and cannot be booked.');
    }

    // ─── RACE-CONDITION-SAFE BOOKING ───────────────────────────────────────────
    // Use a Prisma transaction with row-level locking (SELECT ... FOR UPDATE) to
    // serialize concurrent booking attempts for the same seat.
    //
    // How it works:
    // 1. We lock the Seat row with FOR UPDATE. Any concurrent transaction that
    //    tries to lock the SAME seat will BLOCK until this transaction commits
    //    or rolls back. This serializes all booking attempts for the same seat.
    // 2. Inside the lock, we check for overlapping CONFIRMED bookings.
    // 3. If an overlap exists, we throw a ConflictError (409).
    // 4. If no overlap, we create the booking atomically.
    //
    // PostgreSQL guarantees that the winner of the lock race will see the
    // freshest data (no dirty reads), so the loser will always detect the
    // overlap created by the winner and fail cleanly.
    // ──────────────────────────────────────────────────────────────────────────

    const booking = await prisma.$transaction(async (tx) => {
      // Step 1: Lock the seat row for this transaction
      await tx.$executeRaw`SELECT id FROM seats WHERE id = ${seatId} FOR UPDATE`;

      // Step 2: Check for any overlapping CONFIRMED bookings
      const overlap = await tx.booking.findFirst({
        where: {
          seatId,
          status: 'CONFIRMED',
          AND: [
            { startTime: { lt: endTime } },
            { endTime: { gt: startTime } },
          ],
        },
      });

      if (overlap) {
        throw new ConflictError(
          'This seat was just booked by someone else for the selected time slot. Please choose a different seat or time.'
        );
      }

      // Step 3: Create the booking (seat is still available)
      return tx.booking.create({
        data: { seatId, userId, startTime, endTime, status: 'CONFIRMED' },
        include: {
          seat: { include: { room: { select: { id: true, name: true, floor: true, type: true } } } },
          user: { select: { id: true, name: true, email: true } },
        },
      });
    });

    // Broadcast seat update to all clients viewing this room via Socket.io
    const io = getIO();
    io.to(`room:${seat.roomId}`).emit('seat:update', {
      seatId,
      roomId: seat.roomId,
      status: 'BOOKED',
      bookingId: booking.id,
      startTime: booking.startTime,
      endTime: booking.endTime,
    });

    res.status(201).json({ booking });
  } catch (err) {
    next(err);
  }
};

// PUT /api/bookings/:id/cancel — cancel a booking (own booking or admin)
const cancelBooking: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.userId;
    const userRole = req.user!.role;

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { seat: { include: { room: true } } },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }

    // Students can only cancel their own bookings
    if (userRole !== 'ADMIN' && booking.userId !== userId) {
      throw new AppError(403, 'You can only cancel your own bookings.');
    }

    if (booking.status !== 'CONFIRMED') {
      throw new AppError(400, 'Only confirmed bookings can be cancelled.');
    }

    if (new Date(booking.startTime) <= new Date()) {
      throw new AppError(400, 'Cannot cancel a booking that has already started.');
    }

    const updated = await prisma.booking.update({
      where: { id },
      data: { status: 'CANCELLED' },
      include: {
        seat: { include: { room: { select: { id: true, name: true } } } },
      },
    });

    // Broadcast seat freed event to all clients viewing this room
    const io = getIO();
    io.to(`room:${booking.seat.roomId}`).emit('seat:update', {
      seatId: booking.seatId,
      roomId: booking.seat.roomId,
      status: 'AVAILABLE',
      bookingId: id,
    });

    // If admin cancelled someone else's booking, notify that user
    if (userRole === 'ADMIN' && booking.userId !== userId) {
      io.to(`user:${booking.userId}`).emit('booking:admin-cancelled', {
        bookingId: id,
        seatNumber: booking.seat.seatNumber,
        roomName: booking.seat.room.name,
        message: 'Your booking was cancelled by an administrator.',
      });
    }

    res.json({ booking: updated, message: 'Booking cancelled successfully.' });
  } catch (err) {
    next(err);
  }
};

// GET /api/bookings/:id — get a single booking
const getBooking: RequestHandler = async (req: AuthRequest, res, next) => {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: req.params.id },
      include: {
        seat: { include: { room: true } },
        user: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      throw new NotFoundError('Booking not found.');
    }

    // Users can only see their own bookings (admins see all)
    if (req.user!.role !== 'ADMIN' && booking.userId !== req.user!.userId) {
      throw new AppError(403, 'Access denied.');
    }

    res.json({ booking });
  } catch (err) {
    next(err);
  }
};

router.get('/mine', authenticate, getMyBookings as RequestHandler);
router.post('/', authenticate, createBooking as RequestHandler);
router.put('/:id/cancel', authenticate, cancelBooking as RequestHandler);
router.get('/:id', authenticate, getBooking as RequestHandler);

export default router;
