import express from 'express';
import bcrypt from 'bcryptjs';
import { db, toTime24, toDateStr, ENROLLMENT_STATUSES, PROGRAM_TYPES, PROGRAM_DURATIONS } from '../db/database.js';
import { checkStudentAbsence } from '../absence.js';
import { requireAuth, requireAdmin, requireStudent, requireTrainerOrAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { resetFailedLogins, validatePasswordPolicy } from '../middleware/security.js';

const router = express.Router();

// Course or training, and its length (45 days / 6 months / 120 hours)
export function validateProgram({ program_type, program_duration } = {}) {
  if (!PROGRAM_TYPES[program_type]) return { error: 'Please choose whether this is a Course or a Training.' };
  // Only trainings have a fixed length; a course has none
  if (program_type === 'course') return { program_type, program_duration: null };
  if (!PROGRAM_DURATIONS[program_duration]) return { error: 'Please choose the training duration: 45 Days, 6 Weeks, 6 Months, or 120 Hours.' };
  return { program_type, program_duration };
}

// Shared validation for a student's trainer + class timing choice
export function validateClassChoice({ trainer_id, class_start_time, class_end_time } = {}) {
  const trainer = trainer_id ? db.findById('trainers', trainer_id) : null;
  const trainerUser = trainer ? db.findById('users', trainer.user_id) : null;
  if (!trainer || !trainerUser || trainerUser.status !== 'active') {
    return { error: 'Please choose your trainer from the list.' };
  }
  const start = toTime24(class_start_time);
  const end = toTime24(class_end_time);
  if (!start || !end) {
    return { error: 'Please enter your class start and end time.' };
  }
  if (end <= start) {
    return { error: 'Class end time must be after the start time.' };
  }
  return { trainer, start, end };
}

// GET /api/students - List students (Admin sees all; Trainer sees assigned only)
router.get('/', requireAuth, requireTrainerOrAdmin, (req, res) => {
  try {
    const { course_id, trainer_id, search, status, enrollment_status } = req.query;
    let students = db.find('students');

    // If Trainer, filter to assigned students only!
    if (req.user.role === 'trainer') {
      const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
      if (!trainer) {
        return res.json({ success: true, count: 0, data: [] });
      }
      students = students.filter(s => String(s.trainer_id) === String(trainer.id));
    } else if (trainer_id) {
      students = students.filter(s => String(s.trainer_id) === String(trainer_id));
    }

    if (course_id) {
      students = students.filter(s => String(s.course_id) === String(course_id));
    }

    let enriched = students.map(s => db.getEnrichedStudent(s));

    if (status) {
      enriched = enriched.filter(s => s.status === status);
    }
    if (enrollment_status) {
      enriched = enriched.filter(s => s.enrollment_status === enrollment_status);
    }

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(s => 
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        (s.student_id && s.student_id.toLowerCase().includes(q)) ||
        (s.trainer_name && s.trainer_name.toLowerCase().includes(q))
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

// PUT /api/students/me/class - Student picks their trainer and class timing
router.put('/me/class', requireAuth, requireStudent, (req, res) => {
  try {
    const student = db.findOne('students', s => String(s.user_id) === String(req.user.id));
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const result = validateClassChoice(req.body);
    if (result.error) {
      return res.status(400).json({ success: false, message: result.error });
    }

    const trainerChanged = String(student.trainer_id) !== String(result.trainer.id);
    const updated = db.update('students', student.id, {
      trainer_id: result.trainer.id,
      class_start_time: result.start,
      class_end_time: result.end
    });

    if (trainerChanged) {
      db.insert('notifications', {
        user_id: result.trainer.user_id,
        title: 'New Student Joined Your Class',
        message: `${req.user.name} selected you as their trainer.`,
        type: 'student_assigned',
        link: '/trainer/students',
        is_read: false
      });
    }

    logAudit(req, 'STUDENT_CLASS_UPDATED', `Student ${req.user.name} set trainer ID ${result.trainer.id}, timing ${result.start}-${result.end}`);

    return res.json({ success: true, message: 'Your class details have been saved.', data: db.getEnrichedStudent(updated) });
  } catch (err) {
    console.error('Update student class error:', err);
    return res.status(500).json({ success: false, message: 'Failed to save class details.' });
  }
});

// GET /api/students/password-requests - Admin: pending password reset requests
router.get('/password-requests', requireAuth, requireAdmin, (req, res) => {
  try {
    const requests = db.find('password_requests', r => r.status === 'pending')
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(r => {
        const student = db.findById('students', r.student_id);
        const enriched = student ? db.getEnrichedStudent(student) : null;
        return {
          ...r,
          student_name: enriched ? enriched.name : 'Unknown',
          student_email: enriched ? enriched.email : r.email,
          student_code: enriched ? enriched.student_id : 'N/A'
        };
      });
    return res.json({ success: true, count: requests.length, data: requests });
  } catch (err) {
    console.error('Fetch password requests error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load password requests.' });
  }
});

const ENROLLMENT_LABELS = { running: 'Running', hold: 'On Hold', completed: 'Completed', dropped: 'Dropped' };

// PUT /api/students/:id/enrollment - Admin, or the student's own trainer, sets course status:
// running / hold / completed / dropped
router.put('/:id/enrollment', requireAuth, requireTrainerOrAdmin, (req, res) => {
  try {
    const student = db.findById('students', req.params.id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const byTrainer = req.user.role === 'trainer';
    if (byTrainer && String(student.trainer_id) !== String(req.trainerProfile?.id)) {
      return res.status(403).json({ success: false, message: 'You can only change the status of your own students.' });
    }
    const changedBy = byTrainer ? `your trainer ${req.user.name}` : 'the admin';

    const next = req.body?.enrollment_status;
    if (!ENROLLMENT_STATUSES.includes(next)) {
      return res.status(400).json({ success: false, message: `Status must be one of: ${ENROLLMENT_STATUSES.join(', ')}.` });
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim().slice(0, 300) : '';
    const previous = student.enrollment_status || 'running';
    if (previous === next) {
      return res.json({ success: true, message: 'Status unchanged.', data: db.getEnrichedStudent(student) });
    }

    const updates = {
      enrollment_status: next,
      status_history: [
        ...(student.status_history || []),
        { from: previous, to: next, note, by: req.user.id, by_role: req.user.role, by_name: req.user.name, at: new Date().toISOString() }
      ]
    };
    if (next === 'completed') updates.completed_on = toDateStr();
    if (next === 'running') updates.completed_on = null;

    const updated = db.update('students', student.id, updates);
    checkStudentAbsence(updated); // closes absence alerts for students no longer running

    const user = db.findById('users', student.user_id);
    const label = ENROLLMENT_LABELS[next];
    db.insert('notifications', {
      user_id: student.user_id,
      title: `Course Status: ${label}`,
      message: `${changedBy[0].toUpperCase()}${changedBy.slice(1)} changed your course status to "${label}".${note ? ` Note: ${note}` : ''}`,
      type: 'enrollment_status',
      link: '/student/profile',
      is_read: false
    });
    const studentName = user ? user.name : 'A student';
    if (byTrainer) {
      // Trainer made the change: keep the admins informed
      db.find('users', u => u.role === 'admin').forEach(admin => {
        db.insert('notifications', {
          user_id: admin.id,
          title: 'Trainer Changed Course Status',
          message: `${req.user.name} changed ${studentName}'s course status from "${ENROLLMENT_LABELS[previous]}" to "${label}".${note ? ` Note: ${note}` : ''}`,
          type: 'enrollment_status',
          link: '/admin/students',
          is_read: false
        });
      });
    } else {
      const trainer = student.trainer_id ? db.findById('trainers', student.trainer_id) : null;
      if (trainer) {
        db.insert('notifications', {
          user_id: trainer.user_id,
          title: 'Student Course Status Changed',
          message: `${studentName} is now "${label}".${note ? ` Note: ${note}` : ''}`,
          type: 'enrollment_status',
          link: '/trainer/students',
          is_read: false
        });
      }
    }

    logAudit(req, 'STUDENT_ENROLLMENT_STATUS', `Student ${student.student_id}: ${previous} -> ${next} by ${req.user.role} ${req.user.name}${note ? ` (${note})` : ''}`);
    return res.json({ success: true, message: `${user ? user.name : 'Student'} is now ${label}.`, data: db.getEnrichedStudent(updated) });
  } catch (err) {
    console.error('Update enrollment status error:', err);
    return res.status(500).json({ success: false, message: 'Failed to change course status.' });
  }
});

// POST /api/students/:id/reset-password - Admin sets a new password for a student
router.post('/:id/reset-password', requireAuth, requireAdmin, async (req, res) => {
  try {
    const student = db.findById('students', req.params.id);
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student not found.' });
    }
    const user = db.findById('users', student.user_id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User record not found.' });
    }

    const newPassword = typeof req.body?.password === 'string' ? req.body.password.trim() : '';
    const check = validatePasswordPolicy(newPassword);
    if (!check.isValid) {
      return res.status(400).json({ success: false, message: check.message });
    }

    db.update('users', user.id, { password_hash: await bcrypt.hash(newPassword, 10) });
    resetFailedLogins(user.email);

    db.find('password_requests', r => String(r.student_id) === String(student.id) && r.status === 'pending')
      .forEach(r => db.update('password_requests', r.id, { status: 'resolved', resolved_by: req.user.id, resolved_at: new Date().toISOString() }));

    db.insert('notifications', {
      user_id: user.id,
      title: 'Password Changed by Admin',
      message: 'Your password was reset by the administrator. Use the new password they shared with you to sign in.',
      type: 'password_reset',
      is_read: false
    });

    logAudit(req, 'STUDENT_PASSWORD_RESET', `Admin reset password for student ${user.name} (${user.email})`);

    return res.json({ success: true, message: `Password updated for ${user.name}. Share the new password with the student.` });
  } catch (err) {
    console.error('Admin reset password error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reset password.' });
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
      const isAssigned = trainer && String(student.trainer_id) === String(trainer.id);
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
    const { name, email, password, student_id, domain, course_id, trainer_id, class_start_time, class_end_time, program_type, program_duration, phone, address, emergency_contact, avatar } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'Name, email, and initial password are required.' });
    }

    const program = validateProgram({ program_type, program_duration });
    if (program.error) {
      return res.status(400).json({ success: false, message: program.error });
    }

    const cleanEmail = db.normalizeEmail(email);
    const existingUser = db.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'A user with this email already exists.' });
    }

    // Auto-generate student code if not provided
    const nextCode = student_id || `STU-${toDateStr().slice(0, 4)}-${String(db.find('students').length + 1).padStart(3, '0')}`;

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

    const student = db.insert('students', {
      user_id: user.id,
      student_id: nextCode,
      domain: domain ? domain.trim() : '',
      course_id: course_id ? Number(course_id) : null,
      trainer_id: trainer_id ? Number(trainer_id) : null,
      class_start_time: toTime24(class_start_time),
      class_end_time: toTime24(class_end_time),
      enrollment_status: 'running',
      program_type: program.program_type,
      program_duration: program.program_duration,
      phone: phone ? phone.trim() : '',
      address: address ? address.trim() : '',
      emergency_contact: emergency_contact ? emergency_contact.trim() : ''
    });

    logAudit(req, 'STUDENT_CREATED', `Created student account for ${name} (${nextCode}) with trainer ${trainer_id || 'None'}`);

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

    const { name, email, password, student_id, domain, course_id, trainer_id, class_start_time, class_end_time, program_type, program_duration, phone, address, emergency_contact, status, avatar } = req.body;

    let program = null;
    if (program_type !== undefined || program_duration !== undefined) {
      program = validateProgram({
        program_type: program_type ?? student.program_type,
        program_duration: program_duration ?? student.program_duration
      });
      if (program.error) return res.status(400).json({ success: false, message: program.error });
    }

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
    if (trainer_id !== undefined) studentUpdates.trainer_id = trainer_id ? Number(trainer_id) : null;
    if (class_start_time !== undefined) studentUpdates.class_start_time = toTime24(class_start_time);
    if (class_end_time !== undefined) studentUpdates.class_end_time = toTime24(class_end_time);
    if (program) {
      studentUpdates.program_type = program.program_type;
      studentUpdates.program_duration = program.program_duration;
    }
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
