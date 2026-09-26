import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/audit-logs - Admin view system audit logs
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const { action, role, search } = req.query;
    let logs = db.find('audit_logs');

    if (action) {
      logs = logs.filter(l => l.action.toLowerCase().includes(action.toLowerCase()));
    }
    if (role) {
      logs = logs.filter(l => l.user_role === role);
    }
    if (search) {
      const q = search.toLowerCase();
      logs = logs.filter(l => 
        (l.user_name && l.user_name.toLowerCase().includes(q)) ||
        (l.action && l.action.toLowerCase().includes(q)) ||
        (l.details && l.details.toLowerCase().includes(q))
      );
    }

    logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, count: logs.length, data: logs });
  } catch (err) {
    console.error('Fetch audit logs error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve audit logs.' });
  }
});

export default router;
