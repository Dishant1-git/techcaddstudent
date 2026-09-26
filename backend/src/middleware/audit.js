import { db } from '../db/database.js';

export function logAudit(req, action, details, customUser = null) {
  try {
    const user = customUser || req?.user;
    const ip = req?.headers['x-forwarded-for'] || req?.socket?.remoteAddress || '127.0.0.1';

    const entry = {
      user_id: user ? user.id : null,
      user_name: user ? user.name : 'Anonymous',
      user_role: user ? user.role : 'system',
      action,
      details,
      ip_address: typeof ip === 'string' ? ip.replace('::ffff:', '') : '127.0.0.1'
    };

    return db.insert('audit_logs', entry);
  } catch (err) {
    console.error('Failed to log audit event:', err);
  }
}
