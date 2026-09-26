import express from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin, requireTrainerOrAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { resetFailedLogins } from '../middleware/security.js';

const router = express.Router();

// GET /api/students - List students (Admin sees all; Trainer sees assigned only)
router.get('/', requireAuth, requireTrainerOrAdmin, (req, res) => {
  try {
    const { batch_id, course_id, trainer_id, search, status } = req.query;
    let students = db.find('students');

    // If Trainer, filter to assigned students only!
    if (req.user.role === 'trainer') {
      const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
      if (!trainer) {
        return res.json({ success: true, count: 0, data: [] });
      }
      const trainerBatches = db.find('batches', b => String(b.trainer_id) === String(trainer.id)).map(b => String(b.id));
      students = students.filter(s => 
        String(s.trainer_id) === String(trainer.id) || (s.batch_id && trainerBatches.includes(String(s.batch_id)))
      );
    } else if (trainer_id) {
      students = students.filter(s => String(s.trainer_id) === String(trainer_id));
    }

    if (batch_id) {
      students = students.filter(s => String(s.batch_id) === String(batch_id));
    }
    if (course_id) {
      students = students.filter(s => String(s.course_id) === String(course_id));
    }

    let enriched = students.map(s => db.getEnrichedStudent(s));

    if (status) {
      enriched = enriched.filter(s => s.status === status);
    }

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.student_id && s.student_id.toLowerCase().includes(q)) ||
        (s.batch_name && s.batch_name.toLowerCase().includes(q))
      );
    }

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Fetch students error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve students list.' });
  }
});

// GET /api/students/me - For student role to get their own profile & details
router.get('/me', requireAuth, (req, res) => {
  try {
    if (req.user.role !== 'student') {
      return res.status(403).json({ success: false, message: 'Only students can access this endpoint.' });
    }

    const student = db.findOne('students', s => String(s.user_id) === String(req.user.id));
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const enriched = db.getEnrichedStudent(student);
    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Fetch student self error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch student details.' });
  }
});

// GET /api/students/:id - Detailed student view
router.get('/:id', requireAuth, (req, res) => {
  try {
    const student = db.findById('students', req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Role-based security check
    if (req.user.role === 'student') {
      if (String(student.user_id) !== String(req.user.id)) {
        return res.status(403).json({ success: false, message: 'Forbidden. You can only view your own student record.' });
      }
    } else if (req.user.role === 'trainer') {
      const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
      const trainerBatches = trainer ? db.find('batches', b => String(b.trainer_id) === String(trainer.id)).map(b => String(b.id)) : [];
      const isAssigned = trainer && (String(student.trainer_id) === String(trainer.id) || (student.batch_id && trainerBatches.includes(String(student.batch_id))));
      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Forbidden. This student is not assigned to you.' });
      }
    }

    const enriched = db.getEnrichedStudent(student);

    // Attendance History
    const attendanceRecords = db.find('attendance', a => String(a.student_id) === String(student.id))
      .sort((a, b) => new Date(b.date + ' ' + (b.check_in_time || '')) - new Date(a.date + ' ' + (a.check_in_time || '')))
      .map(a => db.getEnrichedAttendance(a));

    let responseData = {
      ...enriched,
      attendance_history: attendanceRecords
    };

    // Complaints history: ONLY included for Admin!
    if (req.user.role === 'admin') {
      const complaints = db.find('complaints', c => String(c.student_id) === String(student.id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        .map(c => db.getEnrichedComplaint(c));
      responseData.complaints_history = complaints;
    }

    return res.json({ success: true, data: responseData });
  } catch (err) {
    console.error('Fetch student detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve student details.' });
  }
});

// POST /api/students - Admin add new student
router.post('/', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, student_id, domain, course_id, batch_id, trainer_id, phone, address, emergency_contact, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and initial password are required.' });
    }

    const cleanEmail = db.normalizeEmail(email);
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    // Auto-generate student code if not provided
    const nextCode = student_id || `STU-${new Date().getFullYear()}-${String(db.find('students').length + 1).padStart(3, '0')}`;

    const password_hash = await bcrypt.hash(password, 10);
    const user = db.insert('users', {
      name: name.trim(),
      email: cleanEmail,
      password_hash,
      role: 'student',
      status: 'active',
      phone: phone ? phone.trim() : '',
      avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`
    });

    // Auto-resolve trainer from batch if batch selected and trainer not explicitly set
    let finalTrainerId = trainer_id;
    if (!finalTrainerId && batch_id) {
      const batch = db.findById('batches', batch_id);
      if (batch && batch.trainer_id) {
        finalTrainerId = batch.trainer_id;
      }
    }

    const student = db.insert('students', {
      user_id: user.id,
      student_id: nextCode,
      domain: domain ? domain.trim() : '',
      course_id: course_id ? Number(course_id) : null,
      batch_id: batch_id ? Number(batch_id) : null,
      trainer_id: finalTrainerId ? Number(finalTrainerId) : null,
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      emergency_contact: emergency_contact ? emergency_contact.trim() : ''
    });

    logAudit(req, 'STUDENT_CREATED', `Created student account for ${name} (${nextCode}) assigned to batch ${batch_id || 'None'}`);

    const enriched = db.getEnrichedStudent(student);
    return res.status(201).json({ success: true, message: 'Student registered successfully', data: enriched });
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }
    console.error('Create student error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create student account.' });
  }
});

// PUT /api/students/:id - Admin update student
router.put('/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const student = db.findById('students', req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const { name, email, password, student_id, domain, course_id, batch_id, trainer_id, phone, address, emergency_contact, status, avatar } = req.body;

    // Update User record
    const userUpdates = {};
    if (name) userUpdates.name = name.trim();
    if (email) {
      const cleanEmail = email.trim().toLowerCase();
      const existing = db.findUserByEmail(cleanEmail);
      if (existing && String(existing.id) !== String(student.user_id)) {
        return res.status(400).json({ success: false, message: 'Email address is already in use.' });
      }
      userUpdates.email = cleanEmail;
    }
    if (status) userUpdates.status = status;
    if (phone !== undefined) userUpdates.phone = phone.trim();
    if (avatar !== undefined) userUpdates.avatar = avatar;
    if (password && password.trim().length >= 6) {
      userUpdates.password_hash = await bcrypt.hash(password.trim(), 10);
    }

    db.update('users', student.user_id, userUpdates);

    // Update Student record
    const studentUpdates = {};
    if (student_id) studentUpdates.student_id = student_id.trim();
    if (domain !== undefined) studentUpdates.domain = typeof domain === 'string' ? domain.trim() : '';
    if (course_id !== undefined) studentUpdates.course_id = course_id ? Number(course_id) : null;
    if (batch_id !== undefined) {
      studentUpdates.batch_id = batch_id ? Number(batch_id) : null;
      if (!trainer_id && batch_id) {
        const batch = db.findById('batches', batch_id);
        if (batch && batch.trainer_id) {
          studentUpdates.trainer_id = batch.trainer_id;
        }
      }
    }
    if (trainer_id !== undefined) studentUpdates.trainer_id = trainer_id ? Number(trainer_id) : null;
    if (phone !== undefined) studentUpdates.phone = phone.trim();
    if (address !== undefined) studentUpdates.address = address.trim();
    if (emergency_contact !== undefined) studentUpdates.emergency_contact = emergency_contact.trim();

    const updatedStudent = db.update('students', student.id, studentUpdates);

    logAudit(req, 'STUDENT_UPDATED', `Updated student details for ID: ${student.student_id}`);

    const enriched = db.getEnrichedStudent(updatedStudent);
    return res.json({ success: true, message: 'Student updated successfully', data: enriched });
  } catch (err) {
    if (err.code === 'DUPLICATE_EMAIL') {
      return res.status(409).json({ success: false, message: 'An account with this email address already exists.' });
    }
    console.error('Update student error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update student.' });
  }
});

// DELETE /api/students/:id - Admin deactivate/delete student
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const student = db.findById('students', req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    // Soft deactivate user
    db.update('users', student.user_id, { status: 'inactive' });
    logAudit(req, 'STUDENT_DEACTIVATED', `Deactivated student record: ${student.student_id}`);

    return res.json({ success: true, message: 'Student account deactivated successfully.' });
  } catch (err) {
    console.error('Delete student error:', err);
    return res.status(500).json({ success: false, message: 'Failed to deactivate student.' });
  }
});

// POST /api/students/:id/approve - Admin approve student registration
router.post('/:id/approve', requireAuth, requireAdmin, (req, res) => {
  try {
    const student = db.findById('students', req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const user = db.findById('users', student.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    // Activate user and clear any previous failed attempt locks
    db.update('users', user.id, { status: 'active', rejection_reason: null });
    resetFailedLogins(user.email);

    // Send notification to the student
    db.insert('notifications', {
      user_id: user.id,
      title: 'Registration Approved! 🎉',
      message: 'Your student account has been verified and approved by the administrator. You can now sign in to access your portal.',
      type: 'student_approval',
      link: '/login',
      is_read: false
    });

    logAudit(req, 'STUDENT_APPROVED', `Admin approved student registration: ${user.name} (${user.email})`);

    const enriched = db.getEnrichedStudent(student);
    return res.json({
      success: true,
      message: `Student account for ${user.name} has been verified and approved successfully.`,
      data: enriched
    });
  } catch (err) {
    console.error('Approve student error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve student registration.' });
  }
});

// POST /api/students/:id/reject - Admin reject student registration
router.post('/:id/reject', requireAuth, requireAdmin, (req, res) => {
  try {
    const student = db.findById('students', req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }

    const user = db.findById('users', student.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim() : '';

    // Mark user as rejected
    db.update('users', user.id, {
      status: 'rejected',
      rejection_reason: reason || 'Application did not meet requirements'
    });

    // Send notification to the student
    db.insert('notifications', {
      user_id: user.id,
      title: 'Registration Rejected',
      message: `Your student registration was rejected by the administrator.${reason ? ` Reason: ${reason}` : ''}`,
      type: 'student_rejection',
      is_read: false
    });

    logAudit(req, 'STUDENT_REJECTED', `Admin rejected student registration: ${user.name} (${user.email}). Reason: ${reason || 'N/A'}`);

    const enriched = db.getEnrichedStudent(student);
    return res.json({
      success: true,
      message: `Student registration for ${user.name} has been rejected.`,
      data: enriched
    });
  } catch (err) {
    console.error('Reject student error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject student registration.' });
  }
});

export default router;
