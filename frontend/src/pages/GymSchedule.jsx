import React, { useEffect, useState } from 'react';
import axios from 'axios';

const sessionTypes = [
  'yoga',
  'pilates',
  'aerobics',
  'zumba',
  'cross circuit',
  'kick-boxing'
];

function getCurrentMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const GymSchedule = () => {
  const [month, setMonth] = useState(getCurrentMonth());
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    setError('');
    axios.get(`/api/gym-sessions?month=${month}`)
      .then(res => setSessions(res.data))
      .catch(() => setError('Failed to load gym schedule.'))
      .finally(() => setLoading(false));
  }, [month]);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <h2 className="text-2xl font-bold mb-4">Gym Schedule</h2>
      <div className="mb-4">
        <label htmlFor="month-select" className="block mb-1 font-medium">Select Month:</label>
        <input
          id="month-select"
          type="month"
          value={month}
          onChange={e => setMonth(e.target.value)}
          className="glass-input w-48 border border-guc-gold/40 dark:border-guc-gold/60 rounded px-2 py-1 bg-white/80 dark:bg-guc-black/80 text-black dark:text-guc-white transition focus:ring-2 focus:ring-guc-gold focus:border-guc-gold outline-none"
          style={{
            backgroundColor: 'var(--input-bg,rgba(255,255,255,0.8))',
            color: 'inherit',
          }}
        />
      </div>
      {loading && <p>Loading...</p>}
      {error && <p className="text-red-500">{error}</p>}
      <div className="mt-4">
        {sessionTypes.map(type => (
          <div key={type} className="mb-6">
            <h3 className="text-xl font-semibold capitalize mb-2">{type}</h3>
            <ul>
              {sessions.filter(s => s.type === type).length === 0 ? (
                <li className="text-gray-500">No sessions this month.</li>
              ) : (
                sessions.filter(s => s.type === type).map(s => (
                  <li key={s._id} className="mb-2 p-2 border rounded bg-gray-50">
                    <span className="font-medium">{new Date(s.date).toLocaleDateString()} </span>
                    <span>({s.startTime} - {s.endTime})</span> | 
                    <span className="ml-2">Instructor: {s.instructor}</span>
                    {s.location && <span className="ml-2">@ {s.location}</span>}
                  </li>
                ))
              )}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GymSchedule;
