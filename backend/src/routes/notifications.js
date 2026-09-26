import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/notifications - Get current user notifications
router.get('/', requireAuth, (req, res) => {
  try {
    const list = db.find('notifications', n => String(n.user_id) === String(req.user.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const unreadCount = list.filter(n => !n.is_read).length;

    return res.json({
      success: true,
      unreadCount,
      count: list.length,
      data: list
    });
  } catch (err) {
    console.error('Fetch notifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve notifications.' });
  }
});

// PUT /api/notifications/:id/read - Mark notification as read
router.put('/:id/read', requireAuth, (req, res) => {
  try {
    const notif = db.findById('notifications', req.params.id);
    if (!notif) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    if (String(notif.user_id) !== String(req.user.id) && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Forbidden.' });
    }

    const updated = db.update('notifications', notif.id, { is_read: true });
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Mark read error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark notification as read.' });
  }
});

// PUT /api/notifications/read-all - Mark all user notifications as read
router.put('/read-all', requireAuth, (req, res) => {
  try {
    const userNotifs = db.find('notifications', n => String(n.user_id) === String(req.user.id) && !n.is_read);
    userNotifs.forEach(n => {
      db.update('notifications', n.id, { is_read: true });
    });

    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (err) {
    console.error('Mark all read error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark all as read.' });
  }
});

// POST /api/notifications/broadcast - Admin broadcast
router.post('/broadcast', requireAuth, requireAdmin, (req, res) => {
  try {
    const { target_role, title, message } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, message: 'Title and message are required.' });
    }

    let targetUsers = [];
    if (target_role && target_role !== 'all') {
      targetUsers = db.find('users', u => u.role === target_role && u.status === 'active');
    } else {
      targetUsers = db.find('users', u => u.status === 'active');
    }

    targetUsers.forEach(u => {
      db.insert('notifications', {
        user_id: u.id,
        title: title.trim(),
        message: message.trim(),
        type: 'system_announcement',
        is_read: false,
        link: '/'
      });
    });

    logAudit(req, 'BROADCAST_SENT', `Broadcast announcement sent to ${targetUsers.length} users (Target: ${target_role || 'all'})`);

    return res.json({
      success: true,
      message: `Announcement broadcast to ${targetUsers.length} active users.`
    });
  } catch (err) {
    console.error('Broadcast notification error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send broadcast announcement.' });
  }
});

export default router;
