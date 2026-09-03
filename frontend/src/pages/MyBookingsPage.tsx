import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { format, formatDistanceToNow, differenceInMinutes } from 'date-fns';
import type { Booking } from '../types';
import { bookingsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { AxiosError } from 'axios';
import { generateGoogleCalendarUrl, downloadIcsFile } from '../utils/calendar';
import QrPass from '../components/QrPass';

const STATUS_BADGE: Record<string, string> = {
  CONFIRMED: 'badge-available',
  CANCELLED: 'badge-booked',
  COMPLETED: 'badge bg-gray-500/15 text-gray-400 border border-gray-500/20',
};

function BookingTimerWarning({ endTime }: { endTime: string }) {
  const [minutesLeft, setMinutesLeft] = useState<number | null>(null);
  const { showToast } = useToast();
  const hasWarnedRef = useRef(false);

  useEffect(() => {
    const update = () => {
      const mins = differenceInMinutes(new Date(endTime), new Date());
      setMinutesLeft(mins);

      if (mins > 0 && mins <= 15 && !hasWarnedRef.current) {
        hasWarnedRef.current = true;
        showToast('warning', 'Booking Ending Soon', `Your study session ends in ${mins} minute${mins !== 1 ? 's' : ''}.`);
      }
    };

    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [endTime, showToast]);

  if (minutesLeft === null || minutesLeft > 15 || minutesLeft <= 0) return null;

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/15 border border-amber-500/30 rounded-lg">
      <div className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
      <span className="text-[11px] font-semibold text-amber-300">Ends in {minutesLeft}m</span>
    </div>
  );
}

function BookingCard({
  booking,
  onCancel,
  onViewPass,
}: {
  booking: Booking;
  onCancel: (id: string) => void;
  onViewPass: (booking: Booking) => void;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const { showToast } = useToast();
  const room = booking.seat?.room;
  const isPast = new Date(booking.startTime) <= new Date();
  const isUpcoming = booking.status === 'CONFIRMED' && !isPast;
  const canCancel = booking.status === 'CONFIRMED' && new Date(booking.startTime) > new Date();

  const handleCancel = async () => {
    if (!confirm(`Cancel booking for Seat ${booking.seat?.seatNumber}?`)) return;
    setIsCancelling(true);
    try {
      await bookingsApi.cancel(booking.id);
      showToast('success', 'Booking Cancelled', 'Your seat has been released and updated across all clients.');
      onCancel(booking.id);
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      showToast('error', 'Cancellation Failed', error.response?.data?.error ?? 'Could not cancel booking.');
    } finally {
      setIsCancelling(false);
    }
  };

  const calendarDetails = {
    title: `DeskFree: Seat ${booking.seat?.seatNumber} (${room?.name ?? 'Library'})`,
    description: `DeskFree Reservation\nSeat: ${booking.seat?.seatNumber}\nRoom: ${room?.name ?? ''} (Floor ${room?.floor ?? ''})\nPass ID: ${booking.id}`,
    location: `${room?.name ?? 'Library'}, Floor ${room?.floor ?? 1}, Central Library`,
    startTime: booking.startTime,
    endTime: booking.endTime,
  };

  return (
    <div className={`glass-card p-4 sm:p-5 transition-all ${isCancelling ? 'opacity-50' : ''}`}>
      <div className="flex items-start gap-3 sm:gap-4">
        {/* Seat Badge */}
        <div className="w-11 h-11 sm:w-12 sm:h-12 bg-gradient-to-br from-brand-600/30 to-purple-600/20 border border-brand-500/30 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-xs sm:text-sm font-bold text-brand-300 font-mono">
            {booking.seat?.seatNumber}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1">
            <h3 className="text-sm sm:text-base font-bold text-white truncate">
              {room?.name ?? 'Study Room'}
            </h3>
            <span className={`text-[10px] sm:text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[booking.status] ?? 'badge'}`}>
              {booking.status}
            </span>
            {isUpcoming && <BookingTimerWarning endTime={booking.endTime} />}
          </div>

          <div className="text-xs text-gray-400 space-y-0.5">
            <p className="flex items-center gap-1.5">
              <span>📅</span> {format(new Date(booking.startTime), 'EEE, MMM d, yyyy')}
            </p>
            <p className="flex items-center gap-1.5">
              <span>⏰</span> {format(new Date(booking.startTime), 'h:mm a')} – {format(new Date(booking.endTime), 'h:mm a')}
            </p>
            {room && <p className="text-[11px] text-gray-500">Floor {room.floor} · {room.type.replace('_', ' ')}</p>}
            {isUpcoming && (
              <p className="text-[11px] font-semibold text-brand-400 mt-1">
                Starts {formatDistanceToNow(new Date(booking.startTime), { addSuffix: true })}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-white/5">
        {/* Calendar & Pass Quick Actions */}
        <div className="flex items-center gap-1.5">
          {booking.status === 'CONFIRMED' && (
            <>
              <button
                onClick={() => onViewPass(booking)}
                className="btn-ghost text-xs py-1 px-2 text-brand-300 hover:text-white flex items-center gap-1"
                title="View Check-In QR Pass"
              >
                <span>🎟️</span>
                <span>QR Pass</span>
              </button>
              <a
                href={generateGoogleCalendarUrl(calendarDetails)}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost text-xs py-1 px-2 text-gray-400 hover:text-white flex items-center gap-1"
                title="Add to Google Calendar"
              >
                <span>📅</span>
                <span className="hidden sm:inline">Calendar</span>
              </a>
              <button
                onClick={() => downloadIcsFile(calendarDetails)}
                className="btn-ghost text-xs py-1 px-2 text-gray-400 hover:text-white flex items-center gap-1"
                title="Download iCal File"
              >
                <span>📥</span>
                <span className="hidden sm:inline">.ics</span>
              </button>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 ml-auto">
          {room && (
            <Link
              to={`/rooms/${room.id}`}
              className="btn-secondary text-xs py-1.5 px-3 active:scale-95"
            >
              View Room
            </Link>
          )}
          {canCancel && (
            <button
              id={`cancel-booking-${booking.id}`}
              onClick={handleCancel}
              disabled={isCancelling}
              className="btn-danger text-xs py-1.5 px-3 flex items-center gap-1.5 active:scale-95"
            >
              {isCancelling && (
                <div className="w-3 h-3 border border-white/30 border-t-white rounded-full animate-spin" />
              )}
              Cancel Booking
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MyBookingsPage() {
  const [upcoming, setUpcoming] = useState<Booking[]>([]);
  const [past, setPast] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activePassBooking, setActivePassBooking] = useState<Booking | null>(null);
  const { showToast } = useToast();

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const data = await bookingsApi.mine();
      setUpcoming(data.upcoming || []);
      setPast(data.past || []);
    } catch {
      showToast('error', 'Error', 'Failed to load your reservations.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = (id: string) => {
    setUpcoming((prev) => prev.filter((b) => b.id !== id));
    fetchBookings();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">My Reservations</h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage study sessions, view passes, and sync to calendar</p>
        </div>
        <Link to="/rooms" className="btn-primary self-start sm:self-auto text-xs sm:text-sm py-2 px-4 shadow-lg shadow-brand-500/20">
          + Book Another Seat
        </Link>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="glass-card p-5 space-y-3">
              <div className="skeleton h-5 w-48" />
              <div className="skeleton h-4 w-32" />
              <div className="skeleton h-8 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-8">
          {/* Upcoming bookings */}
          <section>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              Active & Upcoming Reservations ({upcoming.length})
            </h2>

            {upcoming.length === 0 ? (
              <div className="glass-card p-8 sm:p-10 text-center">
                <div className="w-14 h-14 bg-surface-600/40 rounded-2xl flex items-center justify-center mx-auto mb-3">
                  <span className="text-2xl">🪑</span>
                </div>
                <h3 className="text-base font-bold text-white mb-1">No upcoming reservations</h3>
                <p className="text-xs text-gray-400 mb-4 max-w-sm mx-auto">
                  Reserve a quiet desk or group discussion room to focus on your studies.
                </p>
                <Link to="/rooms" className="btn-primary text-xs sm:text-sm py-2 px-4 inline-block">
                  Browse Available Spaces
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {upcoming.map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onCancel={handleCancel}
                    onViewPass={setActivePassBooking}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Past bookings */}
          {past.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Past Reservations ({past.length})
              </h2>
              <div className="space-y-3 opacity-80">
                {past.slice(0, 10).map((b) => (
                  <BookingCard
                    key={b.id}
                    booking={b}
                    onCancel={handleCancel}
                    onViewPass={setActivePassBooking}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {/* QR Check-In Pass Modal */}
      {activePassBooking && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in"
          onClick={() => setActivePassBooking(null)}
        >
          <div
            className="glass-card max-w-sm w-full p-6 rounded-3xl border border-white/10 shadow-2xl text-center animate-slide-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-brand-400 uppercase tracking-wider">Library Digital Pass</span>
              <button
                onClick={() => setActivePassBooking(null)}
                className="text-gray-400 hover:text-white p-1 rounded-full bg-surface-600/50"
              >
                ✕
              </button>
            </div>

            <QrPass
              code={activePassBooking.id}
              seatNumber={activePassBooking.seat?.seatNumber ?? 'SEAT'}
              roomName={activePassBooking.seat?.room?.name ?? 'Library Room'}
            />

            <div className="mt-4 p-3 bg-surface-800/80 rounded-xl text-xs text-gray-300 text-left space-y-1">
              <p><strong>Room:</strong> {activePassBooking.seat?.room?.name}</p>
              <p><strong>Seat:</strong> {activePassBooking.seat?.seatNumber}</p>
              <p><strong>Time:</strong> {format(new Date(activePassBooking.startTime), 'h:mm a')} – {format(new Date(activePassBooking.endTime), 'h:mm a')}</p>
            </div>

            <button
              onClick={() => setActivePassBooking(null)}
              className="btn-primary w-full mt-4 py-2.5 text-xs font-bold"
            >
              Close Pass
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
