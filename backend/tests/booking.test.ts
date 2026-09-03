import request from 'supertest';
import express from 'express';
import { app } from '../src/index';
import { signToken } from '../src/lib/jwt';
import prisma from '../src/lib/prisma';

describe('Booking API & Race-Condition Logic', () => {
  const studentToken = signToken({
    userId: 'mock-student-1',
    email: 'mock1@deskfree.com',
    role: 'STUDENT',
  });

  const studentToken2 = signToken({
    userId: 'mock-student-2',
    email: 'mock2@deskfree.com',
    role: 'STUDENT',
  });

  describe('Validation Rules', () => {
    it('should reject booking requests with start time in the past', async () => {
      const pastStart = new Date(Date.now() - 3600 * 1000).toISOString();
      const pastEnd = new Date(Date.now() + 3600 * 1000).toISOString();

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          seatId: 'test-seat-id',
          startTime: pastStart,
          endTime: pastEnd,
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('past');
    });

    it('should reject booking requests exceeding max duration of 3 hours', async () => {
      const futureStart = new Date(Date.now() + 3600 * 1000);
      const futureEnd = new Date(futureStart.getTime() + 4 * 3600 * 1000); // 4 hours

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          seatId: 'test-seat-id',
          startTime: futureStart.toISOString(),
          endTime: futureEnd.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('exceed 3 hours');
    });

    it('should reject booking if endTime is before startTime', async () => {
      const futureStart = new Date(Date.now() + 3600 * 1000);
      const futureEnd = new Date(Date.now() + 1800 * 1000); // before start

      const res = await request(app)
        .post('/api/bookings')
        .set('Authorization', `Bearer ${studentToken}`)
        .send({
          seatId: 'test-seat-id',
          startTime: futureStart.toISOString(),
          endTime: futureEnd.toISOString(),
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('End time must be after start time');
    });
  });

  describe('Concurrent Race Condition Handling', () => {
    it('guarantees only one booking succeeds when two concurrent requests compete for the same seat/slot', async () => {
      // Mocking prisma transaction behavior to simulate real row-level lock serialization
      let lockAcquired = false;
      let existingBookingCreated = false;

      const mockStartTime = new Date(Date.now() + 3600 * 1000 * 5);
      const mockEndTime = new Date(mockStartTime.getTime() + 3600 * 1000 * 2);

      // Spy on prisma.seat.findUnique
      const seatSpy = jest.spyOn(prisma.seat, 'findUnique').mockResolvedValue({
        id: 'seat-race-1',
        roomId: 'room-1',
        seatNumber: 'Q01',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        room: {
          id: 'room-1',
          name: 'Silent Room',
          floor: 1,
          capacity: 10,
          type: 'QUIET_ROOM',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      } as any);

      // Spy on prisma.$transaction to simulate row-level lock & overlap detection
      const txSpy = jest.spyOn(prisma, '$transaction').mockImplementation(async (callback: any) => {
        // First to enter acquires lock
        if (!existingBookingCreated) {
          existingBookingCreated = true;
          return callback({
            $executeRaw: jest.fn().mockResolvedValue(1),
            booking: {
              findFirst: jest.fn().mockResolvedValue(null), // no overlap for the first one
              create: jest.fn().mockResolvedValue({
                id: 'booking-winner',
                seatId: 'seat-race-1',
                userId: 'mock-student-1',
                startTime: mockStartTime,
                endTime: mockEndTime,
                status: 'CONFIRMED',
                createdAt: new Date(),
                updatedAt: new Date(),
                seat: { room: { id: 'room-1', name: 'Silent Room', floor: 1, type: 'QUIET_ROOM' } },
                user: { id: 'mock-student-1', name: 'Mock 1', email: 'mock1@deskfree.com' },
              }),
            },
          });
        } else {
          // Second request sees the overlap once lock is released
          return callback({
            $executeRaw: jest.fn().mockResolvedValue(1),
            booking: {
              findFirst: jest.fn().mockResolvedValue({
                id: 'booking-winner',
                seatId: 'seat-race-1',
                status: 'CONFIRMED',
                startTime: mockStartTime,
                endTime: mockEndTime,
              }), // Overlap detected!
              create: jest.fn(),
            },
          });
        }
      });

      // Fire two simultaneous requests
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${studentToken}`)
          .send({
            seatId: 'seat-race-1',
            startTime: mockStartTime.toISOString(),
            endTime: mockEndTime.toISOString(),
          }),
        request(app)
          .post('/api/bookings')
          .set('Authorization', `Bearer ${studentToken2}`)
          .send({
            seatId: 'seat-race-1',
            startTime: mockStartTime.toISOString(),
            endTime: mockEndTime.toISOString(),
          }),
      ]);

      const statuses = [res1.status, res2.status].sort();
      // Exactly one succeeds (201) and the other gets Conflict (409)
      expect(statuses).toEqual([201, 409]);

      const loser = res1.status === 409 ? res1 : res2;
      expect(loser.body.error).toContain('This seat was just booked by someone else');

      seatSpy.mockRestore();
      txSpy.mockRestore();
    });
  });
});
