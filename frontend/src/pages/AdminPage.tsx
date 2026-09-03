import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import type { Room, Booking } from '../types';
import { adminApi, bookingsApi } from '../api';
import { useToast } from '../context/ToastContext';
import { AxiosError } from 'axios';

type AdminTab = 'overview' | 'rooms' | 'bookings' | 'users';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  _count: { bookings: number };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="glass-card p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-400">{label}</p>
          <p className={`text-3xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <div className={`text-3xl`}>{icon}</div>
      </div>
    </div>
  );
}

// ─── Room Management ──────────────────────────────────────────────────────────
function RoomManagement() {
  const [rooms, setRooms] = useState<(Room & { _count?: { seats: number } })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [form, setForm] = useState({ name: '', floor: 1, capacity: 10, type: 'QUIET_ROOM' });
  const { showToast } = useToast();

  const fetchRooms = async () => {
    setIsLoading(true);
    try { setRooms(await adminApi.listRooms()); } catch { /* ignore */ }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await adminApi.createRoom({ ...form, floor: Number(form.floor), capacity: Number(form.capacity) });
      showToast('success', 'Room created!');
      setShowAddForm(false);
      setForm({ name: '', floor: 1, capacity: 10, type: 'QUIET_ROOM' });
      fetchRooms();
    } catch (err) {
      const error = err as AxiosError<{ error: string }>;
      showToast('error', 'Failed to create room', error.response?.data?.error);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This will remove all seats and bookings.`)) return;
    try {
      await adminApi.deleteRoom(id);
      showToast('success', 'Room deleted');
      setRooms((prev) => prev.filter((r) => r.id !== id));
    } catch {
      showToast('error', 'Failed to delete room');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="section-title">Room Management</h2>
        <button id="add-room-btn" onClick={() => setShowAddForm(!showAddForm)} className="btn-primary text-sm">
          {showAddForm ? 'Cancel' : '+ Add Room'}
        </button>
      </div>

      {showAddForm && (
        <div className="glass-card p-5 animate-slide-up">
          <h3 className="font-semibold text-white mb-4">New Room</h3>
          <form onSubmit={handleCreate} id="create-room-form" className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Room Name</label>
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="input-field" placeholder="Silent Study Hall" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Floor</label>
              <input type="number" min={1} value={form.floor} onChange={(e) => setForm({ ...form, floor: Number(e.target.value) })} className="input-field" required />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Capacity</label>
              <input type="number" min={1} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: Number(e.target.value) })} className="input-field" required />
            </div>
            <div className="col-span-2">
              <label className="block text-xs text-gray-400 mb-1">Type</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} className="input-field">
                <option value="QUIET_ROOM">Quiet Room</option>
                <option value="GROUP_ROOM">Group Room</option>
                <option value="OPEN_SEATING">Open Seating</option>
              </select>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="btn-primary flex-1">Create Room</button>
              <button type="button" onClick={() => setShowAddForm(false)} className="btn-secondary flex-1">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/5">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Floor</th>
              <th className="pb-3 pr-4">Type</th>
              <th className="pb-3 pr-4">Capacity</th>
              <th className="pb-3 pr-4">Seats</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={i}><td colSpan={6} className="py-4"><div className="skeleton h-5 w-full" /></td></tr>
              ))
            ) : rooms.map((room) => (
              <tr key={room.id} className="hover:bg-surface-600/30 transition-colors">
                <td className="py-3 pr-4 font-medium text-white">{room.name}</td>
                <td className="py-3 pr-4 text-gray-400">{room.floor}</td>
                <td className="py-3 pr-4 text-gray-400">{room.type.replace('_', ' ')}</td>
                <td className="py-3 pr-4 text-gray-400">{room.capacity}</td>
                <td className="py-3 pr-4 text-gray-400">{room._count?.seats ?? '—'}</td>
                <td className="py-3">
                  <button
                    id={`delete-room-${room.id}`}
                    onClick={() => handleDelete(room.id, room.name)}
                    className="text-xs text-red-400 hover:text-red-300 transition-colors"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── All Bookings ─────────────────────────────────────────────────────────────
function AllBookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('CONFIRMED');
  const { showToast } = useToast();

  useEffect(() => {
    setIsLoading(true);
    adminApi.listBookings({ status: statusFilter || undefined })
      .then(setBookings)
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, [statusFilter]);

  const handleCancel = async (bookingId: string) => {
    if (!confirm('Cancel this booking?')) return;
    try {
      await bookingsApi.cancel(bookingId);
      showToast('success', 'Booking cancelled');
      setBookings((prev) => prev.filter((b) => b.id !== bookingId));
    } catch {
      showToast('error', 'Failed to cancel booking');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4">
        <h2 className="section-title">All Bookings</h2>
        <select
          id="admin-booking-status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="input-field text-sm w-auto"
        >
          <option value="">All</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
          <option value="COMPLETED">Completed</option>
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/5">
              <th className="pb-3 pr-4">User</th>
              <th className="pb-3 pr-4">Seat</th>
              <th className="pb-3 pr-4">Room</th>
              <th className="pb-3 pr-4">Date</th>
              <th className="pb-3 pr-4">Time</th>
              <th className="pb-3 pr-4">Status</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}><td colSpan={7} className="py-4"><div className="skeleton h-5 w-full" /></td></tr>
              ))
            ) : bookings.length === 0 ? (
              <tr><td colSpan={7} className="py-10 text-center text-gray-500">No bookings found</td></tr>
            ) : bookings.map((b) => (
              <tr key={b.id} className="hover:bg-surface-600/30 transition-colors">
                <td className="py-3 pr-4">
                  <p className="font-medium text-white">{b.user?.name}</p>
                  <p className="text-xs text-gray-500">{b.user?.email}</p>
                </td>
                <td className="py-3 pr-4 font-mono text-gray-300">{b.seat?.seatNumber}</td>
                <td className="py-3 pr-4 text-gray-400">{b.seat?.room?.name}</td>
                <td className="py-3 pr-4 text-gray-400">{format(new Date(b.startTime), 'MMM d, yyyy')}</td>
                <td className="py-3 pr-4 text-gray-400">
                  {format(new Date(b.startTime), 'h:mm a')}–{format(new Date(b.endTime), 'h:mm a')}
                </td>
                <td className="py-3 pr-4">
                  <span className={b.status === 'CONFIRMED' ? 'badge-available' : b.status === 'CANCELLED' ? 'badge-booked' : 'badge text-gray-400'}>
                    {b.status}
                  </span>
                </td>
                <td className="py-3">
                  {b.status === 'CONFIRMED' && new Date(b.startTime) > new Date() && (
                    <button
                      id={`admin-cancel-${b.id}`}
                      onClick={() => handleCancel(b.id)}
                      className="text-xs text-red-400 hover:text-red-300 transition-colors"
                    >
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Users ────────────────────────────────────────────────────────────────────
function UsersPanel() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    adminApi.listUsers()
      .then((u) => setUsers(u as AdminUser[]))
      .catch(() => undefined)
      .finally(() => setIsLoading(false));
  }, []);

  return (
    <div className="space-y-5">
      <h2 className="section-title">Users ({users.length})</h2>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500 border-b border-white/5">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Email</th>
              <th className="pb-3 pr-4">Role</th>
              <th className="pb-3 pr-4">Bookings</th>
              <th className="pb-3">Joined</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <tr key={i}><td colSpan={5} className="py-4"><div className="skeleton h-5 w-full" /></td></tr>
              ))
            ) : users.map((u) => (
              <tr key={u.id} className="hover:bg-surface-600/30 transition-colors">
                <td className="py-3 pr-4 font-medium text-white">{u.name}</td>
                <td className="py-3 pr-4 text-gray-400">{u.email}</td>
                <td className="py-3 pr-4">
                  <span className={u.role === 'ADMIN' ? 'badge bg-brand-500/15 text-brand-300 border border-brand-500/20' : 'badge bg-gray-500/15 text-gray-400 border border-gray-500/20'}>
                    {u.role}
                  </span>
                </td>
                <td className="py-3 pr-4 text-gray-400">{u._count.bookings}</td>
                <td className="py-3 text-gray-500">{format(new Date(u.createdAt), 'MMM d, yyyy')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ─── Main Admin Page ──────────────────────────────────────────────────────────
export default function AdminPage() {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [stats, setStats] = useState<Record<string, number>>({});

  useEffect(() => {
    adminApi.stats().then(setStats).catch(() => undefined);
  }, []);

  const tabs: { id: AdminTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'rooms', label: 'Rooms' },
    { id: 'bookings', label: 'Bookings' },
    { id: 'users', label: 'Users' },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 md:pb-12">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Admin Dashboard</h1>
        <p className="text-xs sm:text-sm text-gray-400 mt-1">Manage rooms, seats, bookings, and users</p>
      </div>

      {/* Responsive Tabs */}
      <div className="flex gap-1 mb-6 bg-surface-700/60 p-1 rounded-xl w-full sm:w-fit overflow-x-auto no-scrollbar">
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            id={`admin-tab-${id}`}
            onClick={() => setActiveTab(id)}
            className={`px-3.5 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all duration-200 active:scale-95 ${
              activeTab === id
                ? 'bg-brand-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-surface-500/50'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-fade-in">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard label="Total Users" value={stats.totalUsers ?? 0} icon="👤" color="text-brand-400" />
            <StatCard label="Total Rooms" value={stats.totalRooms ?? 0} icon="🏛️" color="text-purple-400" />
            <StatCard label="Active Seats" value={stats.totalSeats ?? 0} icon="🪑" color="text-amber-400" />
            <StatCard label="Active Bookings" value={stats.activeBookings ?? 0} icon="✅" color="text-emerald-400" />
          </div>
          <div className="glass-card p-6">
            <p className="text-gray-400 text-sm">Use the tabs above to manage rooms, view all bookings, and see user accounts.</p>
          </div>
        </div>
      )}

      {activeTab === 'rooms' && (
        <div className="glass-card p-6 animate-fade-in">
          <RoomManagement />
        </div>
      )}

      {activeTab === 'bookings' && (
        <div className="glass-card p-6 animate-fade-in">
          <AllBookings />
        </div>
      )}

      {activeTab === 'users' && (
        <div className="glass-card p-6 animate-fade-in">
          <UsersPanel />
        </div>
      )}
    </div>
  );
}
