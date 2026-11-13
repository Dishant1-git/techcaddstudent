import express from 'express';
import { db, countWorkingDays } from '../db/database.js';
import { requireAuth, requireAdmin, requireStudent } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';
import { checkStudentAbsence, resolveAlert } from '../absence.js';

const router = express.Router();
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function enrichLeave(leave) {
  const student = db.findById('students', leave.student_id);
  const enriched = student ? db.getEnrichedStudent(student) : null;
  return {
    ...leave,
    days: countWorkingDays(leave.from_date, leave.to_date),
    student_name: enriched ? enriched.name : 'Unknown Student',
    student_code: enriched ? enriched.student_id : 'N/A',
    student_email: enriched ? enriched.email : '',
    trainer_name: enriched ? enriched.trainer_name : 'N/A'
  };
}

function validateRange(from_date, to_date) {
  if (!DATE_PATTERN.test(from_date || '') || !DATE_PATTERN.test(to_date || '')) {
    return 'Please choose the leave start and end dates.';
  }
  if (to_date < from_date) return 'Leave end date must be on or after the start date.';
  return '';
}

// Tells the student and their trainer, and re-checks absence so alerts stop right away
function afterApproval(req, leave, student) {
  const user = db.findById('users', student.user_id);
  db.insert('notifications', {
    user_id: student.user_id,
    title: 'Leave Approved',
    message: `Your leave from ${leave.from_date} to ${leave.to_date} has been approved.`,
    type: 'leave_approved',
    link: '/student/attendance',
    is_read: false
  });
  const trainer = student.trainer_id ? db.findById('trainers', student.trainer_id) : null;
  if (trainer) {
    db.insert('notifications', {
      user_id: trainer.user_id,
      title: 'Student On Approved Leave',
      message: `${user ? user.name : 'Your student'} is on approved leave from ${leave.from_date} to ${leave.to_date}${leave.reason ? ` (${leave.reason})` : ''}.`,
      type: 'leave_approved',
      link: '/trainer/students',
      is_read: false
    });
  }
  // The leave covers the absent days, so close any open alert for this student
  db.find('absence_alerts', a => String(a.student_id) === String(student.id) && a.status === 'open')
    .filter(a => leave.from_date <= a.last_absent_date && leave.to_date >= a.first_absent_date)
    .forEach(a => resolveAlert(a, 'leave_approved', req.user.id));
  checkStudentAbsence(student);
}

// POST /api/leaves - Student requests leave
router.post('/', requireAuth, requireStudent, (req, res) => {
  try {
    const student = req.studentProfile;
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const { from_date, to_date } = req.body;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';
    const error = validateRange(from_date, to_date);
    if (error) return res.status(400).json({ success: false, message: error });
    if (!reason) return res.status(400).json({ success: false, message: 'Please tell us the reason for your leave.' });

    const overlap = db.findOne('leaves', l =>
      String(l.student_id) === String(student.id) && l.status !== 'rejected' &&
      l.from_date <= to_date && l.to_date >= from_date
    );
    if (overlap) {
      return res.status(400).json({ success: false, message: `You already have a ${overlap.status} leave for ${overlap.from_date} to ${overlap.to_date}.` });
    }

    const leave = db.insert('leaves', {
      student_id: student.id,
      from_date,
      to_date,
      reason,
      status: 'pending',
      requested_by: 'student',
      admin_note: ''
    });

    db.find('users', u => u.role === 'admin').forEach(admin => {
      db.insert('notifications', {
        user_id: admin.id,
        title: 'Leave Request',
        message: `${req.user.name} requested leave from ${from_date} to ${to_date}: "${reason}"`,
        type: 'leave_request',
        link: '/admin/absences?tab=leaves',
        is_read: false
      });
    });

    logAudit(req, 'LEAVE_REQUESTED', `Student ${req.user.name} requested leave ${from_date} to ${to_date}`);
    return res.status(201).json({ success: true, message: 'Leave request sent to the admin.', data: enrichLeave(leave) });
  } catch (err) {
    console.error('Request leave error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit leave request.' });
  }
});

// GET /api/leaves/my - Student's own leaves
router.get('/my', requireAuth, requireStudent, (req, res) => {
  const student = req.studentProfile;
  const leaves = student
    ? db.find('leaves', l => String(l.student_id) === String(student.id))
        .sort((a, b) => b.from_date.localeCompare(a.from_date))
        .map(enrichLeave)
    : [];
  return res.json({ success: true, data: leaves });
});

// GET /api/leaves - Admin: all leaves (optionally ?status=pending)
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    const leaves = db.find('leaves', l => !status || l.status === status)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(enrichLeave);
    return res.json({ success: true, count: leaves.length, data: leaves });
  } catch (err) {
    console.error('Fetch leaves error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load leaves.' });
  }
});

// POST /api/leaves/grant - Admin grants leave directly (e.g. from an absence alert)
router.post('/grant', requireAuth, requireAdmin, (req, res) => {
  try {
    const student = db.findById('students', req.body.student_id);
    if (!student) return res.status(404).json({ success: false, message: 'Student not found.' });

    const { from_date, to_date } = req.body;
    const error = validateRange(from_date, to_date);
    if (error) return res.status(400).json({ success: false, message: error });
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 500) : '';

    const leave = db.insert('leaves', {
      student_id: student.id,
      from_date,
      to_date,
      reason: reason || 'Approved by admin',
      status: 'approved',
      requested_by: 'admin',
      admin_note: '',
      reviewed_by: req.user.id,
      reviewed_at: new Date().toISOString()
    });

    afterApproval(req, leave, student);
    logAudit(req, 'LEAVE_GRANTED', `Admin granted leave for student ID ${student.student_id}: ${from_date} to ${to_date}`);
    return res.status(201).json({ success: true, message: 'Leave approved. Absence alerts for these days have stopped.', data: enrichLeave(leave) });
  } catch (err) {
    console.error('Grant leave error:', err);
    return res.status(500).json({ success: false, message: 'Failed to approve leave.' });
  }
});

function reviewLeave(decision) {
  return (req, res) => {
    try {
      const leave = db.findById('leaves', req.params.id);
      if (!leave) return res.status(404).json({ success: false, message: 'Leave not found.' });
      if (leave.status !== 'pending') {
        return res.status(400).json({ success: false, message: `This leave is already ${leave.status}.` });
      }
      const student = db.findById('students', leave.student_id);
      const admin_note = typeof req.body?.admin_note === 'string' ? req.body.admin_note.trim().slice(0, 500) : '';

      const updated = db.update('leaves', leave.id, {
        status: decision,
        admin_note,
        reviewed_by: req.user.id,
        reviewed_at: new Date().toISOString()
      });

      if (student && decision === 'approved') {
        afterApproval(req, updated, student);
      } else if (student) {
        db.insert('notifications', {
          user_id: student.user_id,
          title: 'Leave Not Approved',
          message: `Your leave from ${leave.from_date} to ${leave.to_date} was not approved.${admin_note ? ` Note: ${admin_note}` : ''}`,
          type: 'leave_rejected',
          link: '/student/attendance',
          is_read: false
        });
      }

      logAudit(req, decision === 'approved' ? 'LEAVE_APPROVED' : 'LEAVE_REJECTED', `Leave ${leave.id} ${decision} (${leave.from_date} to ${leave.to_date})`);
      return res.json({ success: true, message: `Leave ${decision}.`, data: enrichLeave(updated) });
    } catch (err) {
      console.error('Review leave error:', err);
      return res.status(500).json({ success: false, message: 'Failed to update leave.' });
    }
  };
}

router.post('/:id/approve', requireAuth, requireAdmin, reviewLeave('approved'));
router.post('/:id/reject', requireAuth, requireAdmin, reviewLeave('rejected'));

export default router;
