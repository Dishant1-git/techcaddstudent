import express from 'express';
import { db } from '../db/database.js';
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

// POST /api/absence/alerts/:id/dismiss - Admin stops alerts for this absence without a leave
router.post('/alerts/:id/dismiss', requireAuth, requireAdmin, (req, res) => {
  const alert = db.findById('absence_alerts', req.params.id);
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });
  const updated = resolveAlert(alert, 'dismissed', req.user.id);
  logAudit(req, 'ABSENCE_ALERT_DISMISSED', `Dismissed absence alert ${alert.id} for student ID ${alert.student_id}`);
  return res.json({ success: true, message: 'Alert dismissed.', data: getEnrichedAlert(updated) });
});

export default router;
