import { useState, useEffect, useCallback } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import type { RoomDetail, Seat, SeatUpdateEvent } from '../types';
import { roomsApi } from '../api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import SeatGrid from '../components/SeatGrid';
import BookingModal from '../components/BookingModal';

const ROOM_TYPE_LABELS: Record<string, string> = {
  QUIET_ROOM: '🤫 Quiet Room',
  GROUP_ROOM: '👥 Group Room',
  OPEN_SEATING: '☀️ Open Seating',
};

function DetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-5">
      <div className="skeleton h-5 w-48" />
      <div className="skeleton h-8 w-64" />
      <div className="glass-card p-5 space-y-3">
        <div className="skeleton h-5 w-36" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="skeleton h-10 w-full" />
          <div className="skeleton h-10 w-full" />
        </div>
      </div>
      <div className="glass-card p-5">
        <div className="skeleton h-5 w-40 mb-4" />
        <div className="grid grid-cols-6 sm:grid-cols-8 gap-2">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="skeleton aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function RoomDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSeat, setSelectedSeat] = useState<Seat | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);

  // Time slot state
  const initStart =
    searchParams.get('startTime') ??
    (() => {
      const d = new Date();
      d.setMinutes(0, 0, 0);
      d.setHours(d.getHours() + 1);
      return d.toISOString();
    })();
  const initEnd =
    searchParams.get('endTime') ??
    (() => {
      const d = new Date(initStart);
      d.setHours(d.getHours() + 2);
      return d.toISOString();
    })();

  const [startTime, setStartTime] = useState(initStart.slice(0, 16));
  const [endTime, setEndTime] = useState(initEnd.slice(0, 16));

  const fetchRoom = useCallback(async () => {
    if (!id) return;
    setIsLoading(true);
    try {
      const data = await roomsApi.get(id, {
        startTime: startTime ? new Date(startTime).toISOString() : undefined,
        endTime: endTime ? new Date(endTime).toISOString() : undefined,
      });
      setRoom(data);
    } catch {
      setRoom(null);
    } finally {
      setIsLoading(false);
    }
  }, [id, startTime, endTime]);

  useEffect(() => {
    fetchRoom();
  }, [fetchRoom]);

  // Real-time seat updates via Socket.io
  const handleSeatUpdate = useCallback((event: SeatUpdateEvent) => {
    setRoom((prev) => {
      if (!prev) return prev;
      const seats = prev.seats.map((s) => {
        if (s.id !== event.seatId) return s;
        return { ...s, status: event.status, booking: event.status === 'AVAILABLE' ? null : s.booking };
      });
      return { ...prev, seats };
    });
    setSelectedSeat((prev) => {
      if (prev && prev.id === event.seatId && event.status === 'BOOKED') return null;
      return prev;
    });
  }, []);

  const handleSeatDeleted = useCallback((event: { seatId: string }) => {
    setRoom((prev) => {
      if (!prev) return prev;
      return { ...prev, seats: prev.seats.filter((s) => s.id !== event.seatId) };
    });
  }, []);

  useSocket({
    token,
    roomId: id ?? null,
    onSeatUpdate: handleSeatUpdate,
    onSeatDeleted: handleSeatDeleted,
  });

  const isTimeSlotSelected = !!(startTime && endTime);

  const handleSelectSeat = (seat: Seat) => {
    setSelectedSeat(seat);
  };

  const handleBookingSuccess = () => {
    setSelectedSeat(null);
    fetchRoom();
  };

  if (isLoading) return <DetailSkeleton />;

  if (!room) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="text-xl font-bold text-white mb-2">Room Not Found</h2>
        <p className="text-xs sm:text-sm text-gray-400 mb-6">This room doesn't exist or was removed by an administrator.</p>
        <Link to="/rooms" className="btn-primary inline-flex text-xs sm:text-sm">
          Return to Rooms
        </Link>
      </div>
    );
  }

  const availableSeats = room.seats.filter((s) => s.status === 'AVAILABLE').length;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-5 pb-32 md:pb-12">
      {/* Mobile Back / Breadcrumb */}
      <div className="flex items-center gap-2 mb-4">
        <Link
          to="/rooms"
          className="flex items-center gap-1.5 text-xs text-brand-400 hover:text-brand-300 font-medium py-1 px-2.5 rounded-lg bg-surface-700/60 border border-white/5 active:scale-95 transition-all"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Spaces
        </Link>
        <span className="text-xs text-gray-500 truncate">/ {room.name}</span>
      </div>

      {/* Room Header Card */}
      <div className="glass-card p-4 sm:p-6 mb-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{room.name}</h1>
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse flex-shrink-0" title="Live sync" />
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span className="font-medium text-gray-300">Floor {room.floor}</span>
              <span>·</span>
              <span>{ROOM_TYPE_LABELS[room.type]}</span>
              <span>·</span>
              <span className={availableSeats > 0 ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                {availableSeats} available
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Time Slot Picker */}
      <div className="glass-card p-4 sm:p-5 mb-5">
        <h2 className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
          Choose Reservation Time
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-[11px] text-gray-400 mb-1">Start Time</span>
            <input
              type="datetime-local"
              value={startTime}
              min={new Date().toISOString().slice(0, 16)}
              onChange={(e) => {
                setStartTime(e.target.value);
                setSelectedSeat(null);
                if (e.target.value) {
                  const end = new Date(e.target.value);
                  end.setHours(end.getHours() + 2);
                  setEndTime(end.toISOString().slice(0, 16));
                }
              }}
              className="input-field text-xs sm:text-sm py-2.5"
            />
          </div>
          <div>
            <span className="block text-[11px] text-gray-400 mb-1">End Time (Max 3 hours)</span>
            <input
              type="datetime-local"
              value={endTime}
              min={startTime}
              onChange={(e) => {
                setEndTime(e.target.value);
                setSelectedSeat(null);
              }}
              className="input-field text-xs sm:text-sm py-2.5"
            />
          </div>
        </div>
      </div>

      {/* Seat Grid Map */}
      <div className="glass-card p-4 sm:p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm sm:text-base font-bold text-white">Interactive Floor Map</h2>
          <span className="text-xs text-gray-400">{room.seats.length} seats</span>
        </div>
        <SeatGrid
          seats={room.seats}
          selectedSeatId={selectedSeat?.id ?? null}
          onSelectSeat={handleSelectSeat}
          isTimeSlotSelected={isTimeSlotSelected}
        />
      </div>

      {/* Mobile Floating Action Bottom Bar (When Seat Selected) */}
      {selectedSeat && (
        <div className="fixed bottom-14 md:bottom-6 left-4 right-4 max-w-lg mx-auto z-30 animate-slide-up">
          <div className="glass-card bg-surface-800/95 border-brand-500/40 p-3.5 shadow-2xl rounded-2xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-brand-600/30 border border-brand-500/40 flex items-center justify-center font-mono font-bold text-brand-300 text-sm">
                {selectedSeat.seatNumber}
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Seat {selectedSeat.seatNumber}</p>
                <p className="text-[11px] text-emerald-400 font-medium">Ready to reserve</p>
              </div>
            </div>
            <button
              onClick={() => setShowBookingModal(true)}
              className="btn-primary text-xs sm:text-sm py-2.5 px-4 font-semibold active:scale-95 flex-shrink-0"
            >
              Continue →
            </button>
          </div>
        </div>
      )}

      {/* Booking Confirmation Bottom Sheet / Modal */}
      {showBookingModal && selectedSeat && isTimeSlotSelected && (
        <BookingModal
          seat={selectedSeat}
          room={room}
          startTime={new Date(startTime).toISOString()}
          endTime={new Date(endTime).toISOString()}
          onClose={() => {
            setShowBookingModal(false);
          }}
          onSuccess={handleBookingSuccess}
        />
      )}
    </div>
  );
}
