import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireStudent, requireTrainer, requireAdmin, requireTrainerOrAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// Helper to format time (e.g. 09:15 AM)
function formatTime(date = new Date()) {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// -------------------------------------------------------------
// STUDENT WORKFLOW
// -------------------------------------------------------------

// POST /api/attendance/mark - Student marks their attendance
router.post('/mark', requireAuth, requireStudent, (req, res) => {
  try {
    const student = db.findOne('students', s => String(s.user_id) === String(req.user.id));
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { session, date, notes } = req.body;
    const sessionName = session ? session.trim() : 'Morning Lecture';
    const targetDate = date ? date.trim() : formatDate();

    // Determine batch and trainer
    const batch = student.batch_id ? db.findById('batches', student.batch_id) : null;
    const trainerId = student.trainer_id || (batch ? batch.trainer_id : null);
    const courseId = student.course_id || (batch ? batch.course_id : null);

    if (!batch) {
      return res.status(400).json({
        success: false,
        message: 'You are not currently assigned to any active batch. Please contact the administrator.'
      });
    }

    // DUPLICATE CHECK: Prevent duplicate attendance for the same student, batch, date, and session
    const duplicate = db.findOne('attendance', a => 
      String(a.student_id) === String(student.id) &&
      String(a.batch_id) === String(batch.id) &&
      a.date === targetDate &&
      a.session.toLowerCase() === sessionName.toLowerCase()
    );

    if (duplicate) {
      return res.status(400).json({
        success: false,
        message: `Attendance has already been marked for '${sessionName}' on ${targetDate} (Status: ${duplicate.status}). Duplicate submissions are not allowed.`
      });
    }

    const checkInTime = formatTime();

    // Create attendance record with initial status 'Pending Verification'
    const newRecord = db.insert('attendance', {
      student_id: student.id,
      trainer_id: trainerId,
      batch_id: batch.id,
      course_id: courseId,
      date: targetDate,
      session: sessionName,
      check_in_time: checkInTime,
      status: 'Pending Verification',
      verification_time: null,
      verified_by: null,
      verified_by_name: null,
      rejection_reason: null,
      notes: notes ? notes.trim() : null
    });

    // Notify assigned Trainer if trainer exists
    if (trainerId) {
      const trainer = db.findById('trainers', trainerId);
      if (trainer) {
        db.insert('notifications', {
          user_id: trainer.user_id,
          title: 'Attendance Verification Required',
          message: `${req.user.name} marked attendance for '${sessionName}' in ${batch.batch_name} on ${targetDate}.`,
          type: 'attendance_pending',
          is_read: false,
          link: '/trainer/verifications'
        });
      }
    }

    logAudit(req, 'ATTENDANCE_MARKED', `Student ${req.user.name} marked attendance for ${sessionName} on ${targetDate} (Batch: ${batch.batch_name})`);

    const enriched = db.getEnrichedAttendance(newRecord);
    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully! Status is Pending Verification by your assigned trainer.',
      data: enriched
    });
  } catch (err) {
    console.error('Mark attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to mark attendance.' });
  }
});

// GET /api/attendance/my - Student views their attendance history and metrics
router.get('/my', requireAuth, requireStudent, (req, res) => {
  try {
    const student = db.findOne('students', s => String(s.user_id) === String(req.user.id));
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { date_from, date_to, session, status } = req.query;

    let records = db.find('attendance', a => String(a.student_id) === String(student.id));

    if (date_from) {
      records = records.filter(a => a.date >= date_from);
    }
    if (date_to) {
      records = records.filter(a => a.date <= date_to);
    }
    if (session) {
      records = records.filter(a => a.session.toLowerCase().includes(session.toLowerCase()));
    }
    if (status) {
      records = records.filter(a => a.status === status);
    }

    records.sort((a, b) => new Date(b.date + ' ' + (b.check_in_time || '')) - new Date(a.date + ' ' + (a.check_in_time || '')));

    const enrichedRecords = records.map(r => db.getEnrichedAttendance(r));

    // Calculate detailed stats for the student
    const allStudentRecords = db.find('attendance', a => String(a.student_id) === String(student.id));
    const totalClasses = allStudentRecords.length;
    const verified = allStudentRecords.filter(a => a.status === 'Verified').length;
    const pending = allStudentRecords.filter(a => a.status === 'Pending Verification').length;
    const rejected = allStudentRecords.filter(a => a.status === 'Rejected').length;
    const attendancePercentage = totalClasses > 0 ? Math.round((verified / totalClasses) * 100) : 100;

    // Check today's attendance
    const todayStr = formatDate();
    const todayRecords = allStudentRecords.filter(a => a.date === todayStr);

    return res.json({
      success: true,
      data: enrichedRecords,
      stats: {
        totalClasses,
        attended: verified,
        pending,
        missed: rejected,
        attendancePercentage,
        todayRecords: todayRecords.map(r => db.getEnrichedAttendance(r))
      }
    });
  } catch (err) {
    console.error('Fetch student attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch attendance history.' });
  }
});

// -------------------------------------------------------------
// TRAINER WORKFLOW (Scoped strictly to assigned students)
// -------------------------------------------------------------

// GET /api/attendance/trainer/pending - List pending attendance verifications for trainer
router.get('/trainer/pending', requireAuth, requireTrainer, (req, res) => {
  try {
    const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer profile not found.' });
    }

    const trainerBatches = db.find('batches', b => String(b.trainer_id) === String(trainer.id)).map(b => String(b.id));
    const assignedStudents = db.find('students', s => 
      String(s.trainer_id) === String(trainer.id) || (s.batch_id && trainerBatches.includes(String(s.batch_id)))
    ).map(s => String(s.id));

    // Filter attendance records where status is Pending Verification and student is assigned
    const pending = db.find('attendance', a => 
      a.status === 'Pending Verification' &&
      (String(a.trainer_id) === String(trainer.id) || assignedStudents.includes(String(a.student_id)))
    ).sort((a, b) => new Date(b.date + ' ' + (b.check_in_time || '')) - new Date(a.date + ' ' + (a.check_in_time || '')))
     .map(a => db.getEnrichedAttendance(a));

    return res.json({ success: true, count: pending.length, data: pending });
  } catch (err) {
    console.error('Fetch pending verifications error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve pending verifications.' });
  }
});

// GET /api/attendance/trainer/all - List all attendance records for trainer's assigned students
router.get('/trainer/all', requireAuth, requireTrainer, (req, res) => {
  try {
    const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer profile not found.' });
    }

    const { batch_id, date, status, search } = req.query;

    const trainerBatches = db.find('batches', b => String(b.trainer_id) === String(trainer.id)).map(b => String(b.id));
    const assignedStudents = db.find('students', s => 
      String(s.trainer_id) === String(trainer.id) || (s.batch_id && trainerBatches.includes(String(s.batch_id)))
    ).map(s => String(s.id));

    let records = db.find('attendance', a => 
      String(a.trainer_id) === String(trainer.id) || assignedStudents.includes(String(a.student_id))
    );

    if (batch_id) {
      records = records.filter(a => String(a.batch_id) === String(batch_id));
    }
    if (date) {
      records = records.filter(a => a.date === date);
    }
    if (status) {
      records = records.filter(a => a.status === status);
    }

    let enriched = records.map(a => db.getEnrichedAttendance(a));

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(a => 
        a.student_name.toLowerCase().includes(q) ||
        (a.student_code && a.student_code.toLowerCase().includes(q)) ||
        (a.session && a.session.toLowerCase().includes(q))
      );
    }

    enriched.sort((a, b) => new Date(b.date + ' ' + (b.check_in_time || '')) - new Date(a.date + ' ' + (a.check_in_time || '')));

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Fetch trainer attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve attendance records.' });
  }
});

// POST /api/attendance/verify/:id - Trainer verifies attendance
router.post('/verify/:id', requireAuth, requireTrainerOrAdmin, (req, res) => {
  try {
    const record = db.findById('attendance', req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    let trainerId = null;
    let trainerName = req.user.name;

    // Check trainer ownership if user is a trainer
    if (req.user.role === 'trainer') {
      const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
      if (!trainer) {
        return res.status(403).json({ success: false, message: 'Trainer profile not found.' });
      }

      const trainerBatches = db.find('batches', b => String(b.trainer_id) === String(trainer.id)).map(b => String(b.id));
      const student = db.findById('students', record.student_id);
      const isAssigned = (student && (String(student.trainer_id) === String(trainer.id) || (student.batch_id && trainerBatches.includes(String(student.batch_id))))) ||
                         String(record.trainer_id) === String(trainer.id);

      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Forbidden. You can only verify attendance for students assigned to you.' });
      }

      trainerId = trainer.id;
      trainerName = req.user.name;
    } else {
      // Admin verification
      trainerId = record.trainer_id || 1;
      trainerName = `${req.user.name} (Admin)`;
    }

    const updated = db.update('attendance', record.id, {
      status: 'Verified',
      verification_time: new Date().toISOString(),
      verified_by: trainerId,
      verified_by_name: trainerName,
      rejection_reason: null
    });

    // Notify Student
    const student = db.findById('students', record.student_id);
    if (student) {
      db.insert('notifications', {
        user_id: student.user_id,
        title: 'Attendance Verified ✓',
        message: `Your attendance for '${record.session}' on ${record.date} has been verified by ${trainerName}.`,
        type: 'attendance_verified',
        is_read: false,
        link: '/student/attendance'
      });
    }

    logAudit(req, 'ATTENDANCE_VERIFIED', `Attendance ID ${record.id} verified by ${trainerName} for student ID ${record.student_id}`);

    const enriched = db.getEnrichedAttendance(updated);
    return res.json({ success: true, message: 'Attendance verified successfully.', data: enriched });
  } catch (err) {
    console.error('Verify attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to verify attendance.' });
  }
});

// POST /api/attendance/reject/:id - Trainer rejects attendance
router.post('/reject/:id', requireAuth, requireTrainerOrAdmin, (req, res) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ success: false, message: 'A rejection reason is required.' });
    }

    const record = db.findById('attendance', req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found.' });
    }

    let trainerId = null;
    let trainerName = req.user.name;

    if (req.user.role === 'trainer') {
      const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
      if (!trainer) {
        return res.status(403).json({ success: false, message: 'Trainer profile not found.' });
      }

      const trainerBatches = db.find('batches', b => String(b.trainer_id) === String(trainer.id)).map(b => String(b.id));
      const student = db.findById('students', record.student_id);
      const isAssigned = (student && (String(student.trainer_id) === String(trainer.id) || (student.batch_id && trainerBatches.includes(String(student.batch_id))))) ||
                         String(record.trainer_id) === String(trainer.id);

      if (!isAssigned) {
        return res.status(403).json({ success: false, message: 'Forbidden. You can only reject attendance for students assigned to you.' });
      }

      trainerId = trainer.id;
      trainerName = req.user.name;
    } else {
      trainerId = record.trainer_id || 1;
      trainerName = `${req.user.name} (Admin)`;
    }

    const updated = db.update('attendance', record.id, {
      status: 'Rejected',
      verification_time: new Date().toISOString(),
      verified_by: trainerId,
      verified_by_name: trainerName,
      rejection_reason: reason.trim()
    });

    // Notify Student
    const student = db.findById('students', record.student_id);
    if (student) {
      db.insert('notifications', {
        user_id: student.user_id,
        title: 'Attendance Rejected ✗',
        message: `Your attendance for '${record.session}' on ${record.date} was rejected by ${trainerName}. Reason: "${reason.trim()}"`,
        type: 'attendance_rejected',
        is_read: false,
        link: '/student/attendance'
      });
    }

    logAudit(req, 'ATTENDANCE_REJECTED', `Attendance ID ${record.id} rejected by ${trainerName}. Reason: ${reason.trim()}`);

    const enriched = db.getEnrichedAttendance(updated);
    return res.json({ success: true, message: 'Attendance rejected.', data: enriched });
  } catch (err) {
    console.error('Reject attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to reject attendance.' });
  }
});

// -------------------------------------------------------------
// ADMIN ATTENDANCE MANAGEMENT & REPORTS
// -------------------------------------------------------------

// GET /api/attendance/admin/all - Admin views all attendance records
router.get('/admin/all', requireAuth, requireAdmin, (req, res) => {
  try {
    const { student_id, trainer_id, course_id, batch_id, date_from, date_to, status, search } = req.query;

    let records = db.find('attendance');

    if (student_id) {
      records = records.filter(a => String(a.student_id) === String(student_id));
    }
    if (trainer_id) {
      records = records.filter(a => String(a.trainer_id) === String(trainer_id));
    }
    if (batch_id) {
      records = records.filter(a => String(a.batch_id) === String(batch_id));
    }
    if (course_id) {
      records = records.filter(a => String(a.course_id) === String(course_id));
    }
    if (date_from) {
      records = records.filter(a => a.date >= date_from);
    }
    if (date_to) {
      records = records.filter(a => a.date <= date_to);
    }
    if (status) {
      records = records.filter(a => a.status === status);
    }

    let enriched = records.map(a => db.getEnrichedAttendance(a));

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(a => 
        a.student_name.toLowerCase().includes(q) ||
        (a.student_code && a.student_code.toLowerCase().includes(q)) ||
        (a.trainer_name && a.trainer_name.toLowerCase().includes(q)) ||
        (a.batch_name && a.batch_name.toLowerCase().includes(q))
      );
    }

    enriched.sort((a, b) => new Date(b.date + ' ' + (b.check_in_time || '')) - new Date(a.date + ' ' + (a.check_in_time || '')));

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Fetch all attendance error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve attendance records.' });
  }
});

// GET /api/attendance/reports - Comprehensive Reports Endpoint for Admin & Trainers
router.get('/reports', requireAuth, requireTrainerOrAdmin, (req, res) => {
  try {
    const { student_id, trainer_id, course_id, batch_id, date_from, date_to, status } = req.query;

    let records = db.find('attendance');

    // If Trainer, enforce scope
    if (req.user.role === 'trainer') {
      const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
      if (!trainer) return res.json({ success: true, data: { records: [], summary: {}, chartData: [] } });

      const trainerBatches = db.find('batches', b => String(b.trainer_id) === String(trainer.id)).map(b => String(b.id));
      const assignedStudents = db.find('students', s => 
        String(s.trainer_id) === String(trainer.id) || (s.batch_id && trainerBatches.includes(String(s.batch_id)))
      ).map(s => String(s.id));

      records = records.filter(a => 
        String(a.trainer_id) === String(trainer.id) || assignedStudents.includes(String(a.student_id))
      );
    } else if (trainer_id) {
      records = records.filter(a => String(a.trainer_id) === String(trainer_id));
    }

    if (student_id) records = records.filter(a => String(a.student_id) === String(student_id));
    if (batch_id) records = records.filter(a => String(a.batch_id) === String(batch_id));
    if (course_id) records = records.filter(a => String(a.course_id) === String(course_id));
    if (date_from) records = records.filter(a => a.date >= date_from);
    if (date_to) records = records.filter(a => a.date <= date_to);
    if (status) records = records.filter(a => a.status === status);

    const enriched = records.map(a => db.getEnrichedAttendance(a));

    // Summary Calculations
    const total = enriched.length;
    const verified = enriched.filter(a => a.status === 'Verified').length;
    const pending = enriched.filter(a => a.status === 'Pending Verification').length;
    const rejected = enriched.filter(a => a.status === 'Rejected').length;
    const percentage = total > 0 ? Math.round((verified / total) * 100) : 100;

    // Date trends aggregation
    const dateMap = {};
    enriched.forEach(r => {
      if (!dateMap[r.date]) {
        dateMap[r.date] = { date: r.date, verified: 0, rejected: 0, pending: 0, total: 0 };
      }
      dateMap[r.date].total += 1;
      if (r.status === 'Verified') dateMap[r.date].verified += 1;
      else if (r.status === 'Rejected') dateMap[r.date].rejected += 1;
      else if (r.status === 'Pending Verification') dateMap[r.date].pending += 1;
    });
    const trends = Object.values(dateMap).sort((a, b) => new Date(a.date) - new Date(b.date));

    // Batch Breakdown
    const batchMap = {};
    enriched.forEach(r => {
      const bName = r.batch_name || 'Unassigned';
      if (!batchMap[bName]) {
        batchMap[bName] = { batch_name: bName, total: 0, verified: 0, rejected: 0, pending: 0 };
      }
      batchMap[bName].total += 1;
      if (r.status === 'Verified') batchMap[bName].verified += 1;
      else if (r.status === 'Rejected') batchMap[bName].rejected += 1;
      else if (r.status === 'Pending Verification') batchMap[bName].pending += 1;
    });
    const batchBreakdown = Object.values(batchMap).map(b => ({
      ...b,
      attendancePercentage: b.total > 0 ? Math.round((b.verified / b.total) * 100) : 100
    }));

    return res.json({
      success: true,
      summary: {
        totalRecords: total,
        verifiedCount: verified,
        pendingCount: pending,
        rejectedCount: rejected,
        overallPercentage: percentage
      },
      trends,
      batchBreakdown,
      records: enriched
    });
  } catch (err) {
    console.error('Fetch reports error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate attendance reports.' });
  }
});

export default router;
