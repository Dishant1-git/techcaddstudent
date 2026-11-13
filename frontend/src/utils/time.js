// Everything in the portal is shown in India Standard Time, whatever the viewer's device is set to.
export const TIME_ZONE = 'Asia/Kolkata';

const dateFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE, year: 'numeric', month: '2-digit', day: '2-digit' });

// IST calendar date as YYYY-MM-DD, optionally shifted by whole days
export function todayIST(offsetDays = 0) {
  const ymd = dateFmt.format(new Date());
  if (!offsetDays) return ymd;
  const d = new Date(`${ymd}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

const valid = (v) => v && !Number.isNaN(new Date(v).getTime());

// 13 Nov 2026, 02:30 PM
export function formatDateTime(value) {
  if (!valid(value)) return '';
  return new Date(value).toLocaleString('en-IN', { timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true });
}

// 13 Nov 2026
export function formatDate(value, options = {}) {
  if (!valid(value)) return '';
  return new Date(value).toLocaleDateString('en-IN', { timeZone: TIME_ZONE, day: '2-digit', month: 'short', year: 'numeric', ...options });
}

// 02:30 PM
export function formatTime(value) {
  if (!valid(value)) return '';
  return new Date(value).toLocaleTimeString('en-IN', { timeZone: TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: true });
}

// True when the timestamp falls on today's IST date
export function isTodayIST(value) {
  return valid(value) && dateFmt.format(new Date(value)) === todayIST();
}
