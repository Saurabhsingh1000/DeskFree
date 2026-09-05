import { PrismaClient, Role, RoomType } from '@prisma/client';
import bcrypt from 'bcryptjs';

export async function autoSeedDatabase(prisma: PrismaClient) {
  try {
    const adminExists = await prisma.user.findUnique({ where: { email: 'admin@deskfree.com' } });
    if (!adminExists) {
      const adminHash = await bcrypt.hash('admin123', 12);
      await prisma.user.create({
        data: {
          name: 'Admin User',
          email: 'admin@deskfree.com',
          passwordHash: adminHash,
          role: Role.ADMIN,
        },
      });
      console.log('✅ Auto-seed: Created admin account');
    }

    const studentExists = await prisma.user.findUnique({ where: { email: 'alice@deskfree.com' } });
    if (!studentExists) {
      const studentHash = await bcrypt.hash('student123', 12);
      await prisma.user.create({
        data: {
          name: 'Alice Student',
          email: 'alice@deskfree.com',
          passwordHash: studentHash,
          role: Role.STUDENT,
        },
      });
      console.log('✅ Auto-seed: Created alice student account');
    }

    const roomCount = await prisma.room.count();
    if (roomCount === 0) {
      const quietRoom = await prisma.room.create({
        data: {
          name: 'Silent Study Hall',
          floor: 1,
          capacity: 20,
          type: RoomType.QUIET_ROOM,
        },
      });

      await prisma.seat.createMany({
        data: Array.from({ length: 20 }, (_, i) => ({
          roomId: quietRoom.id,
          seatNumber: `Q${String(i + 1).padStart(2, '0')}`,
          isActive: i !== 7,
        })),
      });

      const groupRoom = await prisma.room.create({
        data: {
          name: 'Collaboration Hub',
          floor: 2,
          capacity: 12,
          type: RoomType.GROUP_ROOM,
        },
      });

      await prisma.seat.createMany({
        data: Array.from({ length: 12 }, (_, i) => ({
          roomId: groupRoom.id,
          seatNumber: `G${String(i + 1).padStart(2, '0')}`,
          isActive: true,
        })),
      });

      const openRoom = await prisma.room.create({
        data: {
          name: 'Open Study Lounge',
          floor: 1,
          capacity: 30,
          type: RoomType.OPEN_SEATING,
        },
      });

      await prisma.seat.createMany({
        data: Array.from({ length: 30 }, (_, i) => ({
          roomId: openRoom.id,
          seatNumber: `O${String(i + 1).padStart(2, '0')}`,
          isActive: i !== 14 && i !== 15,
        })),
      });

      console.log('✅ Auto-seed: Created initial rooms and seats');
    }
  } catch (error) {
    console.warn('Auto-seed check finished with note:', error);
  }
}
