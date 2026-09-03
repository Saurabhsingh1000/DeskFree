import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Room, RoomType } from '../types';
import { roomsApi } from '../api';

const ROOM_TYPE_CONFIG: Record<RoomType, { icon: string; label: string; color: string; activeColor: string }> = {
  QUIET_ROOM: {
    icon: '🤫',
    label: 'Quiet Room',
    color: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    activeColor: 'bg-blue-600 text-white border-blue-500',
  },
  GROUP_ROOM: {
    icon: '👥',
    label: 'Group Room',
    color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
    activeColor: 'bg-purple-600 text-white border-purple-500',
  },
  OPEN_SEATING: {
    icon: '☀️',
    label: 'Open Seating',
    color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    activeColor: 'bg-amber-600 text-white border-amber-500',
  },
};

function RoomCardSkeleton() {
  return (
    <div className="glass-card p-5 sm:p-6 space-y-4">
      <div className="skeleton h-6 w-2/3" />
      <div className="skeleton h-4 w-1/3" />
      <div className="skeleton h-8 w-full" />
      <div className="skeleton h-11 w-full" />
    </div>
  );
}

function RoomCard({ room, startTime, endTime }: { room: Room; startTime: string; endTime: string }) {
  const config = ROOM_TYPE_CONFIG[room.type];
  const availabilityPercent = room.totalActiveSeats
    ? Math.round(((room.availableSeats ?? 0) / room.totalActiveSeats) * 100)
    : 0;
  const isAvailable = (room.availableSeats ?? 0) > 0;

  return (
    <Link
      to={`/rooms/${room.id}?startTime=${startTime}&endTime=${endTime}`}
      id={`room-card-${room.id}`}
      className="glass-card-hover p-5 sm:p-6 block group active:scale-[0.98] transition-transform"
    >
      {/* Room header */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="text-base sm:text-lg font-bold text-white group-hover:text-brand-300 transition-colors">
            {room.name}
          </h3>
          <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Floor {room.floor} · {room.capacity} Capacity</p>
        </div>
        <span className={`badge border text-xs flex-shrink-0 ${config.color}`}>
          <span className="mr-1">{config.icon}</span> {config.label}
        </span>
      </div>

      {/* Availability Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-gray-400 font-medium">Available Seats</span>
          <span className={`font-semibold ${isAvailable ? 'text-emerald-400' : 'text-red-400'}`}>
            {room.availableSeats ?? 0} / {room.totalActiveSeats ?? room.capacity}
          </span>
        </div>
        <div className="h-2 bg-surface-500 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              availabilityPercent > 50 ? 'bg-emerald-500' : availabilityPercent > 20 ? 'bg-amber-500' : 'bg-red-500'
            }`}
            style={{ width: `${availabilityPercent}%` }}
          />
        </div>
      </div>

      {/* Action Banner */}
      <div
        className={`flex items-center justify-between px-4 py-3 rounded-xl transition-colors ${
          isAvailable
            ? 'bg-brand-600/15 border border-brand-500/30 text-brand-300 group-hover:bg-brand-600/25'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}
      >
        <span className="text-xs sm:text-sm font-semibold">
          {isAvailable ? 'Select Seat & Book →' : 'Currently Full'}
        </span>
        <div className={`w-2.5 h-2.5 rounded-full ${isAvailable ? 'bg-emerald-400 animate-pulse' : 'bg-red-500'}`} />
      </div>
    </Link>
  );
}

export default function RoomsPage() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterType, setFilterType] = useState<RoomType | ''>('');

  // Default time slot: next 2 hours rounded to next hour
  const defaultStart = (() => {
    const d = new Date();
    d.setMinutes(0, 0, 0);
    d.setHours(d.getHours() + 1);
    return d.toISOString().slice(0, 16);
  })();
  const [startTime, setStartTime] = useState(defaultStart);
  const [endTime, setEndTime] = useState(() => {
    const d = new Date(defaultStart);
    d.setHours(d.getHours() + 2);
    return d.toISOString().slice(0, 16);
  });

  // Quick preset helper
  const setQuickDuration = (hours: number) => {
    const start = new Date(startTime || defaultStart);
    const end = new Date(start.getTime() + hours * 3600 * 1000);
    setEndTime(end.toISOString().slice(0, 16));
  };

  useEffect(() => {
    const fetchRooms = async () => {
      setIsLoading(true);
      try {
        const data = await roomsApi.list({
          type: filterType || undefined,
          startTime: startTime ? new Date(startTime).toISOString() : undefined,
          endTime: endTime ? new Date(endTime).toISOString() : undefined,
        });
        setRooms(data);
      } catch (err) {
        console.error('Failed to fetch rooms:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchRooms();
  }, [filterType, startTime, endTime]);

  const minDateTime = new Date().toISOString().slice(0, 16);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
      {/* Mobile-Friendly Title */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Study Spaces</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Real-time availability across campus library floors</p>
      </div>

      {/* Horizontal Category Pill Chips (One-Tap Mobile Filtering) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-5 no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <button
          onClick={() => setFilterType('')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            filterType === ''
              ? 'bg-brand-600 text-white border-brand-500 shadow-md shadow-brand-500/20'
              : 'bg-surface-700/60 text-gray-400 border-white/5 hover:text-white'
          }`}
        >
          All Spaces
        </button>
        <button
          onClick={() => setFilterType('QUIET_ROOM')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            filterType === 'QUIET_ROOM'
              ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-500/20'
              : 'bg-surface-700/60 text-gray-400 border-white/5 hover:text-white'
          }`}
        >
          🤫 Quiet Rooms
        </button>
        <button
          onClick={() => setFilterType('GROUP_ROOM')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            filterType === 'GROUP_ROOM'
              ? 'bg-purple-600 text-white border-purple-500 shadow-md shadow-purple-500/20'
              : 'bg-surface-700/60 text-gray-400 border-white/5 hover:text-white'
          }`}
        >
          👥 Group Rooms
        </button>
        <button
          onClick={() => setFilterType('OPEN_SEATING')}
          className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all border ${
            filterType === 'OPEN_SEATING'
              ? 'bg-amber-600 text-white border-amber-500 shadow-md shadow-amber-500/20'
              : 'bg-surface-700/60 text-gray-400 border-white/5 hover:text-white'
          }`}
        >
          ☀️ Open Seating
        </button>
      </div>

      {/* Time Slot Customizer & Quick Duration Chips */}
      <div className="glass-card p-4 sm:p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
            Booking Window
          </label>
          {/* Quick preset chips */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-gray-500 mr-1">Quick:</span>
            {[1, 2, 3].map((hr) => (
              <button
                key={hr}
                type="button"
                onClick={() => setQuickDuration(hr)}
                className="px-2.5 py-1 text-[11px] font-medium bg-surface-600 hover:bg-surface-500 text-gray-300 rounded-lg transition-colors border border-white/5 active:scale-95"
              >
                +{hr} hr{hr > 1 ? 's' : ''}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <span className="block text-[11px] text-gray-400 mb-1">Start Time</span>
            <input
              type="datetime-local"
              value={startTime}
              min={minDateTime}
              onChange={(e) => {
                setStartTime(e.target.value);
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
            <span className="block text-[11px] text-gray-400 mb-1">End Time</span>
            <input
              type="datetime-local"
              value={endTime}
              min={startTime || minDateTime}
              onChange={(e) => setEndTime(e.target.value)}
              className="input-field text-xs sm:text-sm py-2.5"
            />
          </div>
        </div>
      </div>

      {/* Live Availability Status Indicator */}
      <div className="flex items-center gap-2 mb-4">
        <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
        <span className="text-xs font-medium text-gray-400">Live seat syncing active via WebSockets</span>
      </div>

      {/* Room Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <RoomCardSkeleton key={i} />
          ))}
        </div>
      ) : rooms.length === 0 ? (
        <div className="glass-card py-16 px-4 text-center">
          <div className="w-16 h-16 bg-surface-600/50 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h2 className="text-base font-bold text-white mb-1">No study spaces match this filter</h2>
          <p className="text-xs text-gray-400">Try switching categories or expanding your selected time window.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              startTime={startTime ? new Date(startTime).toISOString() : ''}
              endTime={endTime ? new Date(endTime).toISOString() : ''}
            />
          ))}
        </div>
      )}
    </div>
  );
}
