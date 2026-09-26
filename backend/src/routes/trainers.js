import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin, requireTrainer } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/trainers - List all trainers
router.get('/', requireAuth, (req, res) => {
  try {
    const trainers = db.find('trainers');
    const enriched = trainers.map(t => db.getEnrichedTrainer(t));
    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Fetch trainers error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve trainers.' });
  }
});

// GET /api/trainers/me - Trainer self profile
router.get('/me', requireAuth, requireTrainer, (req, res) => {
  try {
    const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer profile not found.' });
    }

    const enriched = db.getEnrichedTrainer(trainer);

    // Get today's classes / batches
    const batches = db.find('batches', b => String(b.trainer_id) === String(trainer.id));
    const batchIds = batches.map(b => String(b.id));

    // Get assigned students
    const students = db.find('students', s => 
      String(s.trainer_id) === String(trainer.id) || (s.batch_id && batchIds.includes(String(s.batch_id)))
    ).map(s => db.getEnrichedStudent(s));

    return res.json({
      success: true,
      data: {
        ...enriched,
        assigned_students: students
      }
    });
  } catch (err) {
    console.error('Fetch trainer self error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve trainer information.' });
  }
});

// GET /api/trainers/:id - Detailed trainer view
router.get('/:id', requireAuth, (req, res) => {
  try {
    const trainer = db.findById('trainers', req.params.id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    const enriched = db.getEnrichedTrainer(trainer);

    // If Admin, include detailed assigned students and activity
    if (req.user.role === 'admin') {
      const batches = db.find('batches', b => String(b.trainer_id) === String(trainer.id));
      const batchIds = batches.map(b => String(b.id));
      const students = db.find('students', s => 
        String(s.trainer_id) === String(trainer.id) || (s.batch_id && batchIds.includes(String(s.batch_id)))
      ).map(s => db.getEnrichedStudent(s));

      const verifications = db.find('attendance', a => 
        String(a.verified_by) === String(trainer.id)
      ).map(a => db.getEnrichedAttendance(a));

      return res.json({
        success: true,
        data: {
          ...enriched,
          assigned_students: students,
          verification_history: verifications
        }
      });
    }

    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Fetch trainer detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve trainer details.' });
  }
});

// POST /api/trainers - Admin create trainer
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, trainer_id, specialization, phone, bio, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = db.findUserByEmail(cleanEmail);
    if (existing) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    const nextCode = trainer_id || `TRN-${100 + db.find('trainers').length + 1}`;
    const password_hash = await bcrypt.hash(password, 10);

    const user = db.insert('users', {
      name: name.trim(),
      email: cleanEmail,
      password_hash,
      role: 'trainer',
      status: 'active',
      phone: phone ? phone.trim() : '',
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    });

    const trainer = db.insert('trainers', {
      user_id: user.id,
      trainer_id: nextCode,
      specialization: specialization ? specialization.trim() : 'General Instructor',
      phone: phone ? phone.trim() : '',
      bio: bio ? bio.trim() : ''
    });

    logAudit(req, 'TRAINER_CREATED', `Created trainer account for ${name} (${nextCode})`);

    const enriched = db.getEnrichedTrainer(trainer);
    return res.status(201).json({ success: true, message: 'Trainer created successfully', data: enriched });
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }
    console.error('Create trainer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create trainer.' });
  }
});

// PUT /api/trainers/:id - Admin update trainer
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const trainer = db.findById('trainers', req.params.id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    const { name, email, password, specialization, phone, bio, status, trainer_id, avatar } = req.body;

    const userUpdates = {};
    if (name) userUpdates.name = name.trim();
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existing = db.findUserByEmail(cleanEmail);
      if (existing && String(existing.id) !== String(trainer.user_id)) {
        return res.status(400).json({ success: false, message: 'Email is already taken.' });
      }
      userUpdates.email = cleanEmail;
    }
    if (password && password.trim().length >= 6) {
      userUpdates.password_hash = await bcrypt.hash(password.trim(), 10);
    }
    if (status) userUpdates.status = status;
    if (phone !== undefined) userUpdates.phone = phone.trim();
    if (avatar !== undefined) userUpdates.avatar = avatar;

    db.update('users', trainer.user_id, userUpdates);

    const trainerUpdates = {};
    if (trainer_id) trainerUpdates.trainer_id = trainer_id.trim();
    if (specialization !== undefined) trainerUpdates.specialization = specialization.trim();
    if (phone !== undefined) trainerUpdates.phone = phone.trim();
    if (bio !== undefined) trainerUpdates.bio = bio.trim();

    const updatedTrainer = db.update('trainers', trainer.id, trainerUpdates);

    logAudit(req, 'TRAINER_UPDATED', `Updated trainer record: ${trainer.trainer_id}`);

    const enriched = db.getEnrichedTrainer(updatedTrainer);
    return res.json({ success: true, message: 'Trainer updated successfully', data: enriched });
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }
    console.error('Update trainer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update trainer.' });
  }
});

// DELETE /api/trainers/:id - Admin delete/deactivate trainer
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const trainer = db.findById('trainers', req.params.id);
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer not found.' });
    }

    const { permanent } = req.query;

    if (permanent === 'true') {
      db.delete('trainers', trainer.id);
      db.delete('users', trainer.user_id);
      logAudit(req, 'TRAINER_DELETED', `Permanently deleted trainer: ${trainer.trainer_id}`);
      return res.json({ success: true, message: 'Trainer permanently deleted from system.' });
    } else {
      db.update('users', trainer.user_id, { status: 'inactive' });
      logAudit(req, 'TRAINER_DEACTIVATED', `Deactivated trainer: ${trainer.trainer_id}`);
      return res.json({ success: true, message: 'Trainer deactivated successfully.' });
    }
  } catch (err) {
    console.error('Delete trainer error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete/deactivate trainer.' });
  }
});

export default router;
