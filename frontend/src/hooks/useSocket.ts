import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import type { SeatUpdateEvent, BookingAdminCancelledEvent } from '../types';
import { useToast } from '../context/ToastContext';

let socketInstance: Socket | null = null;

function getSocket(token: string | null): Socket {
  if (!socketInstance || !socketInstance.connected) {
    const backendUrl = import.meta.env.VITE_BACKEND_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    socketInstance = io(backendUrl, {
      auth: token ? { token } : undefined,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
    });
  }
  return socketInstance;
}

interface UseSocketOptions {
  token: string | null;
  roomId?: string | null;
  onSeatUpdate?: (event: SeatUpdateEvent) => void;
  onSeatDeleted?: (event: { seatId: string; roomId: string }) => void;
}

export function useSocket({ token, roomId, onSeatUpdate, onSeatDeleted }: UseSocketOptions) {
  const socketRef = useRef<Socket | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (!token) return;

    const socket = getSocket(token);
    socketRef.current = socket;

    // Listen for admin cancellation notifications
    socket.on('booking:admin-cancelled', (event: BookingAdminCancelledEvent) => {
      showToast(
        'warning',
        'Booking Cancelled by Admin',
        `Your booking for seat ${event.seatNumber} in ${event.roomName} was cancelled.`
      );
    });

    return () => {
      socket.off('booking:admin-cancelled');
    };
  }, [token, showToast]);

  useEffect(() => {
    if (!token || !roomId) return;

    const socket = getSocket(token);

    // Join the library room channel
    socket.emit('join-room', roomId);

    if (onSeatUpdate) {
      socket.on('seat:update', onSeatUpdate);
    }

    if (onSeatDeleted) {
      socket.on('seat:deleted', onSeatDeleted);
    }

    return () => {
      socket.emit('leave-room', roomId);
      socket.off('seat:update');
      socket.off('seat:deleted');
    };
  }, [token, roomId, onSeatUpdate, onSeatDeleted]);

  const disconnect = useCallback(() => {
    if (socketInstance) {
      socketInstance.disconnect();
      socketInstance = null;
    }
  }, []);

  return { disconnect };
}
