// Shared TypeScript types for DeskFree frontend

export type Role = 'STUDENT' | 'ADMIN';
export type RoomType = 'QUIET_ROOM' | 'GROUP_ROOM' | 'OPEN_SEATING';
export type BookingStatus = 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';
export type SeatStatus = 'AVAILABLE' | 'BOOKED' | 'MAINTENANCE';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  createdAt?: string;
}

export interface Room {
  id: string;
  name: string;
  floor: number;
  capacity: number;
  type: RoomType;
  totalActiveSeats?: number;
  availableSeats?: number;
  createdAt?: string;
}

export interface Seat {
  id: string;
  roomId: string;
  seatNumber: string;
  isActive: boolean;
  status?: SeatStatus;
  booking?: Booking | null;
}

export interface Booking {
  id: string;
  seatId: string;
  userId: string;
  startTime: string;
  endTime: string;
  status: BookingStatus;
  createdAt: string;
  seat?: Seat & { room?: Pick<Room, 'id' | 'name' | 'floor' | 'type'> };
  user?: Pick<User, 'id' | 'name' | 'email'>;
}

export interface RoomDetail extends Room {
  seats: Seat[];
}

// Socket.io event payloads
export interface SeatUpdateEvent {
  seatId: string;
  roomId: string;
  status: SeatStatus;
  bookingId?: string;
  startTime?: string;
  endTime?: string;
}

export interface BookingAdminCancelledEvent {
  bookingId: string;
  seatNumber: string;
  roomName: string;
  message: string;
}

// API response types
export interface ApiError {
  error: string;
  details?: Array<{ field: string; message: string }>;
}
