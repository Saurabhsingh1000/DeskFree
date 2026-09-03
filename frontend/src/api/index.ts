import api from './axios';
import type { Room, RoomDetail, Booking, User } from '../types';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const authApi = {
  signup: async (data: { name: string; email: string; password: string }) => {
    const res = await api.post<{ token: string; user: User }>('/auth/signup', data);
    return res.data;
  },
  login: async (data: { email: string; password: string }) => {
    const res = await api.post<{ token: string; user: User }>('/auth/login', data);
    return res.data;
  },
  me: async () => {
    const res = await api.get<{ user: User }>('/auth/me');
    return res.data.user;
  },
};

// ─── Rooms ────────────────────────────────────────────────────────────────────

export const roomsApi = {
  list: async (params?: { type?: string; startTime?: string; endTime?: string }) => {
    const res = await api.get<{ rooms: Room[] }>('/rooms', { params });
    return res.data.rooms;
  },
  get: async (id: string, params?: { startTime?: string; endTime?: string }) => {
    const res = await api.get<{ room: RoomDetail }>(`/rooms/${id}`, { params });
    return res.data.room;
  },
};

// ─── Bookings ─────────────────────────────────────────────────────────────────

export const bookingsApi = {
  mine: async () => {
    const res = await api.get<{ upcoming: Booking[]; past: Booking[] }>('/bookings/mine');
    return res.data;
  },
  create: async (data: { seatId: string; startTime: string; endTime: string }) => {
    const res = await api.post<{ booking: Booking }>('/bookings', data);
    return res.data.booking;
  },
  cancel: async (id: string) => {
    const res = await api.put<{ booking: Booking; message: string }>(`/bookings/${id}/cancel`);
    return res.data;
  },
};

// ─── Admin ────────────────────────────────────────────────────────────────────

export const adminApi = {
  stats: async () => {
    const res = await api.get<{ stats: Record<string, number> }>('/admin/stats');
    return res.data.stats;
  },
  listRooms: async () => {
    const res = await api.get<{ rooms: (Room & { _count: { seats: number } })[] }>('/admin/rooms');
    return res.data.rooms;
  },
  createRoom: async (data: { name: string; floor: number; capacity: number; type: string }) => {
    const res = await api.post<{ room: Room }>('/admin/rooms', data);
    return res.data.room;
  },
  updateRoom: async (id: string, data: Partial<{ name: string; floor: number; capacity: number; type: string }>) => {
    const res = await api.put<{ room: Room }>(`/admin/rooms/${id}`, data);
    return res.data.room;
  },
  deleteRoom: async (id: string) => {
    await api.delete(`/admin/rooms/${id}`);
  },
  createSeat: async (data: { roomId: string; seatNumber: string; isActive?: boolean }) => {
    const res = await api.post('/admin/seats', data);
    return res.data;
  },
  updateSeat: async (id: string, data: { seatNumber?: string; isActive?: boolean }) => {
    const res = await api.put(`/admin/seats/${id}`, data);
    return res.data;
  },
  deleteSeat: async (id: string) => {
    await api.delete(`/admin/seats/${id}`);
  },
  listBookings: async (params?: { status?: string; roomId?: string }) => {
    const res = await api.get<{ bookings: Booking[] }>('/admin/bookings', { params });
    return res.data.bookings;
  },
  listUsers: async () => {
    const res = await api.get<{ users: (User & { _count: { bookings: number } })[] }>('/admin/users');
    return res.data.users;
  },
};
