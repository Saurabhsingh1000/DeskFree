import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import type { Seat, Room } from '../types';
import { bookingsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { AxiosError } from 'axios';
import { sounds } from '../utils/sound';
import { triggerConfetti } from '../utils/confetti';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import QrPass from './QrPass';

interface BookingModalProps {
  seat: Seat;
  room: Room;
  startTime: string;
  endTime: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function BookingModal({ seat, room, startTime, endTime, onClose, onSuccess }: BookingModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [bookingId, setBookingId] = useState<string>('');
  const { showToast } = useToast();

  const duration = (new Date(endTime).getTime() - new Date(startTime).getTime()) / (1000 * 60 * 60);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      const newBooking = await bookingsApi.create({ seatId: seat.id, startTime, endTime });
      sounds.playSuccess();
      triggerConfetti();
      setBookingId(newBooking.id || `DF-${Date.now().toString(36).toUpperCase()}`);
      setIsSuccess(true);
      showToast('success', 'Booking Confirmed!', `Seat ${seat.seatNumber} is reserved for you.`);
      onSuccess();
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      const msg = error.response?.data?.error ?? 'Failed to book seat. Please try again.';

      if (error.response?.status === 409) {
        showToast('error', 'Seat Already Taken', msg);
      } else {
        showToast('error', 'Booking Failed', msg);
      }
      setIsLoading(false);
    }
  };

  const calendarDetails = {
    title: `DeskFree Reservation: Seat ${seat.seatNumber} (${room.name})`,
    description: `Library Seat Reservation\nSeat: ${seat.seatNumber}\nRoom: ${room.name} (Floor ${room.floor})\nPass ID: ${bookingId}`,
    location: `${room.name}, Floor ${room.floor}, Central Library`,
    startTime,
    endTime,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      role="dialog"
      aria-modal="true"
      aria-labelledby="booking-modal-title"
    >
      <div className="glass-card w-full sm:max-w-md p-5 sm:p-6 rounded-t-3xl sm:rounded-2xl border-t sm:border border-white/10 animate-slide-up shadow-2xl max-h-[92vh] overflow-y-auto">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-white/20 rounded-full mx-auto mb-4 sm:hidden" />

        {!isSuccess ? (
          /* Confirmation Review View */
          <>
            {/* Header */}
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 id="booking-modal-title" className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>Reserve Seat {seat.seatNumber}</span>
                </h2>
                <p className="text-xs sm:text-sm text-gray-400 mt-0.5">Instant lock & real-time confirmation</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white bg-surface-600/50 hover:bg-surface-500 rounded-full p-1.5 transition-colors"
                aria-label="Close modal"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Booking details */}
            <div className="space-y-3 mb-6">
              <div className="bg-surface-800/80 border border-white/5 rounded-2xl p-4 space-y-3">
                <DetailRow icon="🏛️" label="Study Room" value={room.name} />
                <DetailRow icon="🏢" label="Floor" value={`Floor ${room.floor}`} />
                <DetailRow icon="🪑" label="Selected Seat" value={`Seat ${seat.seatNumber}`} />
                <DetailRow icon="📅" label="Date" value={format(parseISO(startTime), 'EEE, MMM d, yyyy')} />
                <DetailRow icon="⏰" label="Time Slot" value={`${format(parseISO(startTime), 'h:mm a')} – ${format(parseISO(endTime), 'h:mm a')}`} />
                <DetailRow icon="⏱️" label="Duration" value={`${duration.toFixed(1)} hr${duration !== 1 ? 's' : ''}`} />
              </div>

              <div className="flex items-start gap-2.5 px-3.5 py-3 bg-brand-500/10 border border-brand-500/20 rounded-xl">
                <svg className="w-4 h-4 text-brand-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-xs text-brand-300 leading-relaxed">
                  Guaranteed pessimistic lock: no double bookings can occur even under simultaneous clicks.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                id="booking-cancel-btn"
                onClick={onClose}
                className="btn-secondary flex-1 py-3 text-sm active:scale-95"
                disabled={isLoading}
              >
                Cancel
              </button>
              <button
                id="booking-confirm-btn"
                onClick={handleConfirm}
                className="btn-primary flex-1 py-3 text-sm flex items-center justify-center gap-2 active:scale-95 shadow-lg shadow-brand-500/25"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Reserving...</span>
                  </>
                ) : (
                  'Confirm Reservation'
                )}
              </button>
            </div>
          </>
        ) : (
          /* High-Tech Digital Check-In Pass State */
          <div className="space-y-5 text-center animate-fade-in">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto text-2xl shadow-lg shadow-emerald-500/20">
              ✓
            </div>

            <div>
              <h2 className="text-xl font-extrabold text-white tracking-tight">
                You're All Set! 🎉
              </h2>
              <p className="text-xs text-emerald-400 font-medium mt-1">
                Seat {seat.seatNumber} reserved in {room.name}
              </p>
            </div>

            {/* Digital Pass / QR Code Component */}
            <QrPass
              code={bookingId}
              seatNumber={seat.seatNumber}
              roomName={room.name}
            />

            {/* Calendar Export Options */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={generateGoogleCalendarUrl(calendarDetails)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-surface-700 hover:bg-surface-600 border border-white/10 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
              >
                <span>📅</span>
                <span>Google Calendar</span>
              </a>
              <button
                onClick={() => downloadIcsFile(calendarDetails)}
                className="flex items-center justify-center gap-1.5 py-2.5 px-3 bg-surface-700 hover:bg-surface-600 border border-white/10 rounded-xl text-xs font-semibold text-white transition-all active:scale-95"
              >
                <span>📥</span>
                <span>Download iCal</span>
              </button>
            </div>

            {/* Done button */}
            <button
              onClick={onClose}
              className="btn-primary w-full py-3 text-sm font-bold shadow-lg shadow-brand-500/25 active:scale-95"
            >
              Done / Return to Library
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailRow({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-xs sm:text-sm">
      <span className="flex items-center gap-2 text-gray-400">
        <span>{icon}</span>
        {label}
      </span>
      <span className="font-semibold text-white tracking-wide">{value}</span>
    </div>
  );
}
