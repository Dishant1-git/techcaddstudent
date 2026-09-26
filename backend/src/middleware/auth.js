import jwt from 'jsonwebtoken';
import { db } from '../db/database.js';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-portal-2026-auth';

export function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. No token provided.' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.findById('users', decoded.id);
    if (!user) {
      return res.status(401).json({ success: false, message: 'User account not found or deactivated.' });
    }
    if (user.status !== 'active') {
      return res.status(403).json({ success: false, message: 'Account is currently suspended or inactive.' });
    }

    req.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      phone: user.phone,
      avatar: user.avatar
    };

    // If student, attach student profile ID
    if (user.role === 'student') {
      const studentProfile = db.findOne('students', s => String(s.user_id) === String(user.id));
      req.studentProfile = studentProfile;
    }

    // If trainer, attach trainer profile ID
    if (user.role === 'trainer') {
      const trainerProfile = db.findOne('trainers', t => String(t.user_id) === String(user.id));
      req.trainerProfile = trainerProfile;
    }

    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token.' });
  }
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required.' });
    }
    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Forbidden. Role '${req.user.role}' is not authorized to access this resource. Required: [${allowedRoles.join(', ')}]`
      });
    }
    next();
  };
}

export const requireAdmin = requireRole('admin');
export const requireTrainer = requireRole('trainer');
export const requireStudent = requireRole('student');
export const requireTrainerOrAdmin = requireRole('trainer', 'admin');
