# 📚 DeskFree — Real-Time Library & Study Room Seat Booking System

[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.x-2D3748.svg)](https://www.prisma.io/)
[![Socket.io](https://img.shields.io/badge/Socket.io-4.x-010101.svg)](https://socket.io/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.x-38B2AC.svg)](https://tailwindcss.com/)

**DeskFree** is an ultra-modern, full-stack, real-time seat and room reservation web application for university libraries and collaborative workspaces. Designed from the ground up to prevent double-booking race conditions, DeskFree couples sub-50ms WebSocket state synchronization with PostgreSQL pessimistic row-level locking.

---

## 🌟 Key Highlights & Innovations

- 🔒 **Zero Race Conditions:** Enforces pessimistic database row locks (`SELECT ... FOR UPDATE`) inside atomic transactions. Even when multiple users click "Reserve" at the exact same millisecond, duplicate reservations are mathematically impossible.
- ⚡ **Real-Time Live Presence:** Socket.io channels broadcast instant seat state mutations (`AVAILABLE` ↔ `BOOKED` ↔ `MAINTENANCE`) across all connected devices in sub-50ms.
- 📱 **Mobile-First Progressive UX:** Native iOS/Android style bottom navigation bar, touch-optimized `44px+` targets, and swipeable bottom-sheet booking drawers.
- 🎟️ **Digital QR Check-In Pass:** Generates a real-time scannable digital boarding pass with an SVG QR Code for library desk security check-in.
- 📅 **Calendar Synchronization:** One-tap export to **Google Calendar** and downloadable **Apple/Outlook iCal (.ics)** files.
- 🔊 **Zero-Latency Sound Synthesis:** Built-in Web Audio API synthesizer for tactile clicks and celebratory booking chimes with zero external audio assets.
- ⚡ **Smart Seat Auto-Finder:** "Pick Best Seat" 1-tap algorithm prioritizes desks with AC power outlets and window views.
- 🛡️ **Role-Based Access Control:** Secure JWT authentication, bcrypt password hashing (cost factor = 12), with student and admin dashboards.

---

## 🏗️ Architecture & Project Structure

```text
deskfree/
├── backend/
│   ├── prisma/
│   │   ├── schema.prisma       # User, Room, Seat, Booking PostgreSQL schema
│   │   └── seed.ts             # 4 library rooms, 70 seats, admin & demo users
│   ├── src/
│   │   ├── lib/                # Prisma singleton, JWT & Bcrypt helpers
│   │   ├── middleware/         # Auth verification, admin guard, centralized errorHandler
│   │   ├── routes/             # /auth, /rooms, /bookings, /admin routes
│   │   ├── socket/             # Socket.io room-scoped real-time broadcasting
│   │   └── index.ts            # Express server & WebSocket initialization
│   └── tests/
│       ├── auth.test.ts        # Unit tests for token generation & password security
│       └── booking.test.ts     # Concurrency race-condition & validation tests
├── frontend/
│   ├── src/
│   │   ├── api/                # Axios client with automatic Bearer token interceptor
│   │   ├── components/         # SeatGrid, BookingModal, Navbar, QrPass, ToastContainer
│   │   ├── context/            # AuthContext, ToastContext
│   │   ├── hooks/              # useSocket custom hook
│   │   ├── pages/              # RoomsPage, RoomDetailPage, MyBookingsPage, AdminPage, LoginPage, SignupPage
│   │   ├── utils/              # sound.ts (Web Audio), confetti.ts, calendar.ts
│   │   └── types.ts            # TypeScript interfaces
├── docker-compose.yml          # PostgreSQL 16 container definition
├── .env.example                # Environment variables template
└── README.md
```

---

## 🔒 Deep Dive: How DeskFree Prevents Race Conditions

### The Double-Booking Vulnerability (TOCTOU)
When two students view an available seat simultaneously and click "Book" at the same millisecond, simple application-level checks (`findFirst` followed by `create`) fail because both requests query the database before either write has completed. Both see the seat as empty and create duplicate bookings.

### The Solution: Pessimistic Row-Level Locking (`SELECT ... FOR UPDATE`)
DeskFree wraps the entire reservation workflow within a PostgreSQL interactive transaction using row-level locking:

```typescript
// backend/src/routes/bookings.ts
const booking = await prisma.$transaction(async (tx) => {
  // 1. Lock the seat row for UPDATE.
  // Any concurrent transaction attempting to lock or write to this seat is queued.
  await tx.$executeRaw`SELECT id FROM seats WHERE id = ${seatId} FOR UPDATE`;

  // 2. Check for any overlapping confirmed reservation within the locked window
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
    throw new AppError(409, 'Seat is already booked for this time window');
  }

  // 3. Insert reservation atomically
  return tx.booking.create({
    data: { seatId, userId, startTime, endTime, status: 'CONFIRMED' },
  });
});
```

- **Transaction 1** locks the seat row, verifies zero overlap, and creates the booking.
- **Transaction 2** waits at the lock; once unlocked, it reads the updated state, detects the conflict, and cleanly returns `409 Conflict`.
- Verified under automated Jest concurrency tests and live parallel request scripts.

---

## 🚀 Quick Start & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [PostgreSQL](https://www.postgresql.org/) (v14 or higher) or [Docker](https://www.docker.com/)

### 1. Clone & Set Up Database
```bash
# Start PostgreSQL via Docker (if not running natively)
docker-compose up -d

# Or verify local PostgreSQL is active on port 5432
```

### 2. Backend Setup
```bash
cd backend
npm install

# Configure environment variables
cp .env.example .env

# Run Prisma migrations & seed database
npx prisma db push
npm run db:seed

# Start backend dev server
npm run dev
# Server running at http://localhost:3001
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install

# Start frontend dev server
npm run dev
# Vite dev server running at http://localhost:5173
```

---

## 🔑 Demo Accounts

| Role | Email | Password | Permissions |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@deskfree.com` | `admin123` | Room management, seat toggle, maintenance mode, global cancellation |
| **Student 1** | `alice@deskfree.com` | `student123` | Browse, reserve seats, view passes, cancel own bookings |
| **Student 2** | `bob@deskfree.com` | `student123` | Browse, reserve seats, view passes, cancel own bookings |

*(You can also create a new student account instantly via the `/signup` page).*

---

## 📡 REST API Reference

### Authentication
- `POST /api/auth/signup` — Register a new student account (`name`, `email`, `password`)
- `POST /api/auth/login` — Authenticate and receive JWT token
- `GET /api/auth/me` — Retrieve currently logged-in user profile

### Study Rooms
- `GET /api/rooms` — List rooms with active availability counts (supports `type`, `startTime`, `endTime` filters)
- `GET /api/rooms/:id` — Get room details, layout, and seat statuses for a given time window

### Reservations
- `GET /api/bookings/mine` — Retrieve user's active, upcoming, and past reservations
- `POST /api/bookings` — Create a race-condition safe reservation (`seatId`, `startTime`, `endTime`)
- `PUT /api/bookings/:id/cancel` — Cancel a booking and immediately release the seat

### Admin Portal
- `GET /api/admin/stats` — Overall metrics (total bookings, active seats, utilization rate)
- `GET /api/admin/rooms` — Detailed room and seat lists
- `POST /api/admin/rooms` — Create a new study room
- `POST /api/admin/seats` — Add a new seat to a room
- `PUT /api/admin/seats/:id/status` — Toggle seat status (`AVAILABLE` vs `MAINTENANCE`)
- `DELETE /api/admin/seats/:id` — Remove seat from floor plan
- `PUT /api/admin/bookings/:id/cancel` — Administrative cancellation with broadcast alert

---

## ⚡ Real-Time WebSocket Events

The application connects to Socket.io with JWT authentication and automatically subscribes to room channels:

| Event | Direction | Payload | Description |
| :--- | :--- | :--- | :--- |
| `join:room` | Client → Server | `{ roomId }` | Subscribes client to room-specific seat updates |
| `leave:room` | Client → Server | `{ roomId }` | Unsubscribes client from room |
| `seat:updated` | Server → Client | `{ seatId, roomId, status, bookingId }` | Broadcast whenever a seat is reserved, cancelled, or set to maintenance |
| `seat:deleted` | Server → Client | `{ seatId, roomId }` | Broadcast when an admin removes a seat |
| `booking:admin_cancelled` | Server → Client | `{ bookingId, seatNumber, roomName, message }` | Targeted alert sent to student if admin cancels their reservation |

---

## 🧪 Testing Suite

DeskFree includes a test suite running via Jest and Supertest:

```bash
cd backend
npm test
```

### Tests Covered:
- ✅ Password hashing with bcrypt (verifies plain-text password is never saved)
- ✅ JWT signing, token expiry, and authentication middleware validation
- ✅ Input validation for time windows (rejects past dates, enforces max 3-hour duration)
- ✅ **Concurrent Race-Condition Test:** Dispatches simultaneous parallel booking requests for the exact same seat; asserts that exactly one request succeeds (`201 Created`) and the second is rejected (`409 Conflict`).

---

## 💻 Tech Stack Summary

- **Frontend:** React 18, Vite, TypeScript, Tailwind CSS, Date-fns, Web Audio API
- **Backend:** Node.js, Express, TypeScript, Prisma ORM, Socket.io, Zod, Bcrypt, JsonWebToken
- **Database:** PostgreSQL 16
- **Testing:** Jest, Supertest, ts-jest

---

## 📄 License
MIT License. Built for seamless campus and workspace seat reservations.
