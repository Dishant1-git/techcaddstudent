import express from 'express';
import { db, toDateStr } from '../db/database.js';
import { grantLeave, notifyStudentTrainer } from './leaves.js';
import { requireAuth, requireAdmin, requireTrainerOrAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { ABSENCE_THRESHOLD, getEnrichedAlert, resolveAlert, runAbsenceCheck } from '../absence.js';

const router = express.Router();

// GET /api/absence/alerts - Admin sees all, trainer sees their own students. ?status=open|resolved|all
router.get('/alerts', requireAuth, requireTrainerOrAdmin, (req, res) => {
  try {
    const status = req.query.status || 'open';
    let alerts = db.find('absence_alerts', a => status === 'all' || a.status === status);
    if (req.user.role === 'trainer') {
      const ids = new Set(db.getTrainerStudents(req.trainerProfile?.id).map(s => String(s.id)));
      alerts = alerts.filter(a => ids.has(String(a.student_id)));
    }
    const data = alerts
      .sort((a, b) => (b.absent_days - a.absent_days) || new Date(b.updated_at) - new Date(a.updated_at))
      .map(getEnrichedAlert);
    return res.json({ success: true, threshold: ABSENCE_THRESHOLD, count: data.length, data });
  } catch (err) {
    console.error('Fetch absence alerts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load absence alerts.' });
  }
});

// POST /api/absence/check - Admin runs the absence check now
router.post('/check', requireAuth, requireAdmin, (req, res) => {
  const result = runAbsenceCheck();
  return res.json({ success: true, message: `Check complete. ${result.openAlerts} student(s) need attention.`, data: result });
});

function dismissAlert(req, alert) {
  const updated = resolveAlert(alert, 'dismissed', req.user.id);
  const student = db.findById('students', alert.student_id);
  const user = student ? db.findById('users', student.user_id) : null;
  notifyStudentTrainer(
    student,
    'Absence Alert Dismissed',
    `The admin dismissed the absence alert for ${user ? user.name : 'your student'} (absent ${alert.first_absent_date} to ${alert.last_absent_date}).`,
    'absence_dismissed'
  );
  logAudit(req, 'ABSENCE_ALERT_DISMISSED', `Dismissed absence alert ${alert.id} for student ID ${alert.student_id}`);
  return updated;
}

// POST /api/absence/alerts/approve-all - Approve leave for every open alert (first absent day to today)
router.post('/alerts/approve-all', requireAuth, requireAdmin, (req, res) => {
  try {
    const reason = typeof req.body?.reason === 'string' && req.body.reason.trim() ? req.body.reason.trim().slice(0, 500) : 'Approved by admin';
    const today = toDateStr();
    const open = db.find('absence_alerts', a => a.status === 'open');
    let count = 0;
    for (const alert of open) {
      const student = db.findById('students', alert.student_id);
      if (!student) { resolveAlert(alert, 'dismissed', req.user.id); continue; }
      grantLeave(req, student, alert.first_absent_date, today, reason);
      count += 1;
    }
    logAudit(req, 'ABSENCE_ALERTS_APPROVE_ALL', `Approved leave for ${count} absent student(s)`);
    return res.json({ success: true, count, message: `Leave approved for ${count} student(s). Their trainers have been informed.` });
  } catch (err) {
    console.error('Approve all alerts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve all.' });
  }
});

// POST /api/absence/alerts/dismiss-all - Dismiss every open alert
router.post('/alerts/dismiss-all', requireAuth, requireAdmin, (req, res) => {
  try {
    const open = db.find('absence_alerts', a => a.status === 'open');
    open.forEach(a => dismissAlert(req, a));
    return res.json({ success: true, count: open.length, message: `${open.length} alert(s) dismissed. Their trainers have been informed.` });
  } catch (err) {
    console.error('Dismiss all alerts error:', err);
    return res.status(500).json({ success: false, message: 'Failed to dismiss all.' });
  }
});

// POST /api/absence/alerts/:id/dismiss - Admin stops alerts for this absence without a leave
router.post('/alerts/:id/dismiss', requireAuth, requireAdmin, (req, res) => {
  const alert = db.findById('absence_alerts', req.params.id);
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
  if (alert.status !== 'open') return res.status(400).json({ success: false, message: 'This alert is already closed.' });
  const updated = dismissAlert(req, alert);
  return res.json({ success: true, message: 'Alert dismissed.', data: getEnrichedAlert(updated) });
});

export default router;
