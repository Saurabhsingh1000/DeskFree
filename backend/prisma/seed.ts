import { PrismaClient, Role, RoomType, BookingStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing data in dependency order
  await prisma.booking.deleteMany();
  await prisma.seat.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  // Create admin user
  const adminHash = await bcrypt.hash('admin123', 12);
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@deskfree.com',
      passwordHash: adminHash,
      role: Role.ADMIN,
    },
  });
  console.log('✅ Created admin:', admin.email);

  // Create student user 1
  const studentHash = await bcrypt.hash('student123', 12);
  const student = await prisma.user.create({
    data: {
      name: 'Alice Student',
      email: 'alice@deskfree.com',
      passwordHash: studentHash,
      role: Role.STUDENT,
    },
  });
  console.log('✅ Created student:', student.email);

  // Create student user 2
  const student2Hash = await bcrypt.hash('student123', 12);
  const student2 = await prisma.user.create({
    data: {
      name: 'Bob Student',
      email: 'bob@deskfree.com',
      passwordHash: student2Hash,
      role: Role.STUDENT,
    },
  });
  console.log('✅ Created student:', student2.email);

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
  console.log(`✅ Created room: ${quietRoom.name} with 20 seats`);

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
  console.log(`✅ Created room: ${groupRoom.name} with 12 seats`);

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
      isActive: i !== 14 && i !== 15, // seats O15, O16 under maintenance
    })),
  });
  console.log(`✅ Created room: ${openRoom.name} with 30 seats`);

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
  console.log(`✅ Created room: ${premiumRoom.name} with 8 seats`);

  // Create sample bookings
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(10, 0, 0, 0);

  const tomorrowEnd = new Date(tomorrow);
  tomorrowEnd.setHours(12, 0, 0, 0);

  const firstQuietSeat = await prisma.seat.findFirst({
    where: { roomId: quietRoom.id, seatNumber: 'Q01' },
  });

  if (firstQuietSeat) {
    await prisma.booking.create({
      data: {
        seatId: firstQuietSeat.id,
        userId: student.id,
        startTime: tomorrow,
        endTime: tomorrowEnd,
        status: BookingStatus.CONFIRMED,
      },
    });
  }

  const dayAfter = new Date(now);
  dayAfter.setDate(dayAfter.getDate() + 2);
  dayAfter.setHours(14, 0, 0, 0);

  const dayAfterEnd = new Date(dayAfter);
  dayAfterEnd.setHours(16, 0, 0, 0);

  const firstGroupSeat = await prisma.seat.findFirst({
    where: { roomId: groupRoom.id, seatNumber: 'G01' },
  });

  if (firstGroupSeat) {
    await prisma.booking.create({
      data: {
        seatId: firstGroupSeat.id,
        userId: student2.id,
        startTime: dayAfter,
        endTime: dayAfterEnd,
        status: BookingStatus.CONFIRMED,
      },
    });
  }

  console.log('✅ Created sample bookings');
  console.log('\n🎉 Seed complete!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Admin:   admin@deskfree.com  / admin123');
  console.log('  Student: alice@deskfree.com  / student123');
  console.log('  Student: bob@deskfree.com    / student123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
