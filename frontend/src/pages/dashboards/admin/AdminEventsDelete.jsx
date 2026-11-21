import React, { useEffect, useState } from 'react';
import { api } from '../../../utils/api';
import toast from 'react-hot-toast';

export default function AdminEventsDelete() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get('/events/unregistered');
      setEvents(res.data?.data || []);
    } catch (e) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEvents(); }, []);

  const deleteEvent = async (ev) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    try {
      setBusyId(ev._id);
      await api.delete(`/events/${ev._id}`);
      toast.success('Event deleted');
      await loadEvents();
    } catch (e) {
      toast.error(e?.response?.data?.error || 'Failed to delete event');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold">Delete Events (No Registrations)</h2>
      <div className="card">
        {loading ? (
          <div className="p-4 text-sm text-white/80">Loading...</div>
        ) : (
          <ul className="space-y-2">
            {events.map(ev => (
              <li key={ev._id} className="card flex items-center justify-between">
                <div>
                  <div className="font-medium">{ev.title}</div>
                  <div className="text-xs text-gray-300">Type: {ev.type} | Start: {ev.startAt}</div>
                </div>
                <button className="btn bg-red-600 hover:bg-red-700 disabled:opacity-60" disabled={busyId===ev._id} onClick={() => deleteEvent(ev)}>
                  {busyId===ev._id ? 'Deleting...' : 'Delete'}
                </button>
              </li>
            ))}
            {events.length === 0 && (
              <li className="p-4 text-sm text-white/70">No events found.</li>
            )}
          </ul>
        )}
      </div>
    </div>
  );
}
