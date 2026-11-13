import React, { useEffect, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { api } from '../../services/api';

// Dropdown of the active courses the admin has added. onChange(course) gives the full course (or null).
export function CourseSelect({ value, onChange, placeholder = 'Select your course', required = false, disabled = false }) {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    api.getCourseOptions()
      .then(res => { if (active) setCourses(res.data || []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <>
      <span className="relative block">
        <BookOpen className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <select
          required={required}
          disabled={disabled || loading}
          value={value ? String(value) : ''}
          onChange={(e) => onChange(courses.find(c => String(c.id) === e.target.value) || null)}
          className="field-input normal-case tracking-normal font-normal"
        >
          <option value="">{loading ? 'Loading courses...' : placeholder}</option>
          {courses.map(c => (
            <option key={c.id} value={String(c.id)}>
              {c.course_name}{c.duration ? ` · ${c.duration}` : ''}
            </option>
          ))}
        </select>
      </span>
      {!loading && courses.length === 0 && (
        <span className="block mt-1 text-[11px] font-medium normal-case tracking-normal text-amber-700">
          No courses have been added yet. Please ask the admin.
        </span>
      )}
    </>
  );
}
