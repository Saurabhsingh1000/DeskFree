import { PrismaClient, Role, RoomType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function seedDatabase() {
  console.log('🌱 Seeding database...');

  // Create admin user if not exists
  const adminExists = await prisma.user.findUnique({ where: { email: 'admin@deskfree.com' } });
  let admin = adminExists;
  if (!admin) {
    const adminHash = await bcrypt.hash('admin123', 12);
    admin = await prisma.user.create({
      data: {
        name: 'Admin User',
        email: 'admin@deskfree.com',
        passwordHash: adminHash,
        role: Role.ADMIN,
      },
    });
    console.log('✅ Created admin:', admin.email);
  }

  // Create student user 1
  const studentExists = await prisma.user.findUnique({ where: { email: 'alice@deskfree.com' } });
  let student = studentExists;
  if (!student) {
    const studentHash = await bcrypt.hash('student123', 12);
    student = await prisma.user.create({
      data: {
        name: 'Alice Student',
        email: 'alice@deskfree.com',
        passwordHash: studentHash,
        role: Role.STUDENT,
      },
    });
    console.log('✅ Created student:', student.email);
  }

  // Create student user 2
  const student2Exists = await prisma.user.findUnique({ where: { email: 'bob@deskfree.com' } });
  let student2 = student2Exists;
  if (!student2) {
    const student2Hash = await bcrypt.hash('student123', 12);
    student2 = await prisma.user.create({
      data: {
        name: 'Bob Student',
        email: 'bob@deskfree.com',
        passwordHash: student2Hash,
        role: Role.STUDENT,
      },
    });
    console.log('✅ Created student:', student2.email);
  }

  // Create rooms if none exist
  const roomCount = await prisma.room.count();
  if (roomCount === 0) {
    // Create Room 1: Quiet Room (Floor 1)
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
        isActive: i !== 7, // seat Q08 is under maintenance
      })),
    });

    // Create Room 2: Group Room (Floor 2)
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

    // Create Room 3: Open Seating (Floor 1)
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

    // Create Room 4: Quiet Room (Floor 3)
    const premiumRoom = await prisma.room.create({
      data: {
        name: 'Premium Research Suite',
        floor: 3,
        capacity: 8,
        type: RoomType.QUIET_ROOM,
      },
    });

    await prisma.seat.createMany({
      data: Array.from({ length: 8 }, (_, i) => ({
        roomId: premiumRoom.id,
        seatNumber: `P${String(i + 1).padStart(2, '0')}`,
        isActive: true,
      })),
    });

    console.log('✅ Created default rooms and seats');
  }

  console.log('🎉 Seed verification complete!');
}

async function main() {
  await seedDatabase();
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
