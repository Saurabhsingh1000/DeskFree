import { useState, useMemo } from 'react';
import type { Seat } from '../types';
import { sounds } from '../utils/sound';

interface SeatGridProps {
  seats: Seat[];
  selectedSeatId: string | null;
  onSelectSeat: (seat: Seat) => void;
  isTimeSlotSelected: boolean;
}

const statusConfig = {
  AVAILABLE: { className: 'seat-available', label: 'Available' },
  BOOKED: { className: 'seat-booked', label: 'Booked' },
  MAINTENANCE: { className: 'seat-maintenance', label: 'Maintenance' },
};

// Deterministic seat features for realistic modern study spaces
export function getSeatFeatures(seatNumber: string): { power: boolean; window: boolean; monitor: boolean; tag: string } {
  const num = parseInt(seatNumber.replace(/\D/g, '') || '1', 10);
  const power = num % 2 === 1 || num % 3 === 0;
  const windowView = num % 4 === 0 || num % 5 === 0;
  const monitor = num % 6 === 0;

  let tag = 'Standard Desk';
  if (monitor && power) tag = '⚡ Power + 🖥️ 4K Display';
  else if (windowView && power) tag = '⚡ Power + 🪟 Window View';
  else if (windowView) tag = '🪟 Window View';
  else if (power) tag = '⚡ AC Power Outlet';

  return { power, window: windowView, monitor, tag };
}

export default function SeatGrid({ seats, selectedSeatId, onSelectSeat, isTimeSlotSelected }: SeatGridProps) {
  const [filterFeature, setFilterFeature] = useState<'all' | 'power' | 'window' | 'monitor'>('all');

  if (seats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 bg-surface-600/50 rounded-2xl flex items-center justify-center mb-3">
          <svg className="w-8 h-8 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
          </svg>
        </div>
        <p className="text-gray-400 text-sm">No seats configured for this room yet</p>
      </div>
    );
  }

  const availableCount = seats.filter((s) => s.status === 'AVAILABLE').length;
  const bookedCount = seats.filter((s) => s.status === 'BOOKED').length;
  const maintenanceCount = seats.filter((s) => s.status === 'MAINTENANCE').length;

  // Selected seat details
  const selectedSeat = useMemo(() => {
    return seats.find((s) => s.id === selectedSeatId);
  }, [seats, selectedSeatId]);

  const selectedFeatures = selectedSeat ? getSeatFeatures(selectedSeat.seatNumber) : null;

  // Best available seat finder (picks first available with power or window)
  const handleAutoPickBestSeat = () => {
    if (!isTimeSlotSelected) return;
    const available = seats.filter((s) => s.status === 'AVAILABLE');
    if (available.length === 0) return;

    // Prefer seat with power + window
    const best =
      available.find((s) => {
        const f = getSeatFeatures(s.seatNumber);
        return f.power && f.window;
      }) ||
      available.find((s) => getSeatFeatures(s.seatNumber).power) ||
      available[0];

    if (best) {
      sounds.playSelect();
      onSelectSeat(best);
    }
  };

  const handleSeatClick = (seat: Seat) => {
    sounds.playSelect();
    onSelectSeat(seat);
  };

  return (
    <div className="space-y-4">
      {/* Legend & Availability Counters */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-surface-800/80 border border-white/5 rounded-2xl text-xs backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3 sm:gap-5">
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-emerald-500/20 border border-emerald-500/40" />
            <span className="text-gray-300 font-medium">Available ({availableCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-red-500/20 border border-red-500/30" />
            <span className="text-gray-400">Booked ({bookedCount})</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3.5 h-3.5 rounded-md bg-amber-500/20 border border-amber-500/30" />
            <span className="text-gray-400">Maint. ({maintenanceCount})</span>
          </div>
        </div>

        {/* Quick auto-pick button */}
        {availableCount > 0 && isTimeSlotSelected && (
          <button
            onClick={handleAutoPickBestSeat}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500/20 hover:bg-brand-500/30 border border-brand-500/40 text-brand-300 rounded-xl text-xs font-semibold transition-all active:scale-95 shadow-sm"
          >
            <span>⚡</span>
            <span>Pick Best Seat</span>
          </button>
        )}
      </div>

      {/* Amenity Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5 text-xs">
        <span className="text-gray-500 text-[11px] font-semibold uppercase tracking-wider flex-shrink-0">
          Highlight:
        </span>
        <button
          onClick={() => setFilterFeature('all')}
          className={`px-3 py-1 rounded-lg font-medium transition-all flex-shrink-0 ${
            filterFeature === 'all'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-surface-800 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          All Seats
        </button>
        <button
          onClick={() => setFilterFeature('power')}
          className={`px-3 py-1 rounded-lg font-medium transition-all flex-shrink-0 flex items-center gap-1 ${
            filterFeature === 'power'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-surface-800 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <span>⚡</span>
          <span>Power Outlets</span>
        </button>
        <button
          onClick={() => setFilterFeature('window')}
          className={`px-3 py-1 rounded-lg font-medium transition-all flex-shrink-0 flex items-center gap-1 ${
            filterFeature === 'window'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-surface-800 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <span>🪟</span>
          <span>Window View</span>
        </button>
        <button
          onClick={() => setFilterFeature('monitor')}
          className={`px-3 py-1 rounded-lg font-medium transition-all flex-shrink-0 flex items-center gap-1 ${
            filterFeature === 'monitor'
              ? 'bg-brand-500 text-white shadow-sm'
              : 'bg-surface-800 text-gray-400 hover:text-white border border-white/5'
          }`}
        >
          <span>🖥️</span>
          <span>4K Displays</span>
        </button>
      </div>

      {!isTimeSlotSelected && (
        <div className="flex items-center gap-2.5 px-4 py-3 bg-amber-500/10 border border-amber-500/20 rounded-xl animate-fade-in">
          <svg className="w-4 h-4 text-amber-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-xs sm:text-sm text-amber-300">Choose your start and end time above to unlock live seat selection.</p>
        </div>
      )}

      {/* Front of Room Architectural Anchor */}
      <div className="py-1">
        <div className="w-2/3 max-w-xs mx-auto py-1 text-center border-b-2 border-brand-500/40 text-[11px] font-semibold text-gray-500 tracking-wider uppercase">
          Front of Room / Screen
        </div>
      </div>

      {/* Responsive Seat Grid */}
      <div
        className="grid gap-2 sm:gap-2.5 pt-1"
        style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(46px, 1fr))' }}
        role="group"
        aria-label="Interactive Seat Grid"
      >
        {seats.map((seat) => {
          const isSelected = seat.id === selectedSeatId;
          const status = seat.status ?? 'AVAILABLE';
          const config = statusConfig[status];
          const isSelectable = status === 'AVAILABLE' && isTimeSlotSelected;
          const feat = getSeatFeatures(seat.seatNumber);

          const matchesFilter =
            filterFeature === 'all' ||
            (filterFeature === 'power' && feat.power) ||
            (filterFeature === 'window' && feat.window) ||
            (filterFeature === 'monitor' && feat.monitor);

          return (
            <button
              key={seat.id}
              id={`seat-${seat.seatNumber}`}
              onClick={() => isSelectable && handleSeatClick(seat)}
              disabled={!isSelectable}
              aria-label={`Seat ${seat.seatNumber} — ${config.label} — ${feat.tag}`}
              aria-pressed={isSelected}
              title={`${seat.seatNumber}: ${config.label} (${feat.tag})`}
              className={`
                ${isSelected ? 'seat-selected shadow-lg shadow-brand-500/40 ring-2 ring-brand-400' : config.className}
                w-full aspect-square flex flex-col items-center justify-center rounded-xl font-mono text-[11px] sm:text-xs font-bold
                transition-all duration-200 border select-none touch-manipulation relative
                ${!isSelectable && status === 'AVAILABLE' ? 'opacity-50 cursor-not-allowed' : ''}
                ${!matchesFilter ? 'opacity-25 grayscale' : ''}
              `}
            >
              <span>{seat.seatNumber}</span>
              {/* Feature indicator pip */}
              <div className="flex items-center gap-0.5 mt-0.5">
                {feat.power && <span className="text-[8px] leading-none">⚡</span>}
                {feat.window && <span className="text-[8px] leading-none">🪟</span>}
                {feat.monitor && <span className="text-[8px] leading-none">🖥️</span>}
              </div>
              {isSelected && (
                <span className="text-[8px] font-sans uppercase tracking-tighter text-brand-200 font-bold">You</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Selected Seat Feature Card */}
      {selectedSeat && selectedFeatures && (
        <div className="flex items-center justify-between p-3.5 bg-brand-500/10 border border-brand-500/30 rounded-2xl animate-fade-in text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-brand-500/20 border border-brand-500/40 flex items-center justify-center font-mono font-bold text-brand-300">
              {selectedSeat.seatNumber}
            </div>
            <div>
              <p className="font-semibold text-white">Seat {selectedSeat.seatNumber} Selected</p>
              <p className="text-brand-300 text-[11px]">{selectedFeatures.tag}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg text-[11px] font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Available
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
