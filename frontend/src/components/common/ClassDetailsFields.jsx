import React, { useEffect, useState } from 'react';
import { Clock, UserCheck } from 'lucide-react';
import { api } from '../../services/api';

// Trainer dropdown + class start/end time. Trainers come from the ones the admin added.
// value: { trainer_id, class_start_time, class_end_time }
export function ClassDetailsFields({ value, onChange, disabled = false }) {
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    api.getTrainerOptions()
      .then(res => { if (active) setTrainers(res.data || []); })
      .catch(() => { if (active) setError('Could not load trainers. Please refresh the page.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const set = (key) => (event) => onChange({ ...value, [key]: event.target.value });

  return (
    <div className="space-y-4">
      <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
        Your trainer
        <span className="relative block mt-1.5">
          <UserCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <select
            required
            disabled={disabled || loading}
            value={value.trainer_id ? String(value.trainer_id) : ''}
            onChange={set('trainer_id')}
            className="field-input normal-case tracking-normal font-normal"
          >
            <option value="">{loading ? 'Loading trainers...' : 'Select your trainer'}</option>
            {trainers.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.name}{t.specialization ? ` — ${t.specialization}` : ''}
              </option>
            ))}
          </select>
        </span>
        {error && <span className="block mt-1 text-[11px] font-medium normal-case tracking-normal text-rose-600">{error}</span>}
        {!loading && !error && trainers.length === 0 && (
          <span className="block mt-1 text-[11px] font-medium normal-case tracking-normal text-amber-700">
            No trainers have been added yet. Please ask the admin.
          </span>
        )}
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Class starts
          <span className="relative block mt-1.5">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="time"
              required
              disabled={disabled}
              value={value.class_start_time || ''}
              onChange={set('class_start_time')}
              className="field-input"
            />
          </span>
        </label>
        <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
          Class ends
          <span className="relative block mt-1.5">
            <Clock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="time"
              required
              disabled={disabled}
              value={value.class_end_time || ''}
              onChange={set('class_end_time')}
              className="field-input"
            />
          </span>
        </label>
      </div>
    </div>
  );
}

// Returns an error message, or '' when the class details are complete
export function validateClassDetails({ trainer_id, class_start_time, class_end_time }) {
  if (!trainer_id) return 'Please select your trainer.';
  if (!class_start_time || !class_end_time) return 'Please enter your class start and end time.';
  if (class_end_time <= class_start_time) return 'Class end time must be after the start time.';
  return '';
}
