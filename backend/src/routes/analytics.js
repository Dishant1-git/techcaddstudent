import express from 'express';
import { db, formatClassTiming } from '../db/database.js';
import { requireAuth, requireAdmin, requireTrainer, requireStudent } from '../middleware/auth.js';

const router = express.Router();

function formatDate(date = new Date()) {
  return date.toISOString().split('T')[0];
}

// GET /api/analytics/admin - Comprehensive Admin Dashboard Analytics
router.get('/admin', requireAuth, requireAdmin, (req, res) => {
  try {
    const todayStr = formatDate();

    const totalStudents = db.count('students');
    const totalTrainers = db.count('trainers');
    const activeCourses = db.count('courses', c => c.status === 'active');

    const allAttendance = db.find('attendance');
    const todayAttendance = allAttendance.filter(a => a.date === todayStr);
    const pendingVerification = allAttendance.filter(a => a.status === 'Pending Verification');
    const verifiedAttendance = allAttendance.filter(a => a.status === 'Verified');

    const totalComplaints = db.count('complaints');
    const openComplaints = db.count('complaints', c => c.status === 'Open');
    const underReviewComplaints = db.count('complaints', c => c.status === 'Under Review');
    const resolvedComplaints = db.count('complaints', c => c.status === 'Resolved' || c.status === 'Closed');

    const overallAttendancePercentage = allAttendance.length > 0 
      ? Math.round((verifiedAttendance.length / allAttendance.length) * 100) 
      : 100;

    const complaintResolutionRate = totalComplaints > 0 
      ? Math.round((resolvedComplaints / totalComplaints) * 100) 
      : 100;

    // Students with low attendance (< 75%) and pending registration requests
    const allEnrichedStudents = db.find('students').map(s => db.getEnrichedStudent(s));
    const lowAttendanceStudents = allEnrichedStudents.filter(s => s.stats.attendancePercentage < 75 && s.stats.totalClasses > 0);
    const pendingStudentRegistrations = allEnrichedStudents.filter(s => s.status === 'pending_approval').length;

    // Trainer verification activity
    const allTrainers = db.find('trainers').map(t => {
      const enrichedT = db.getEnrichedTrainer(t);
      const verifications = allAttendance.filter(a => String(a.verified_by) === String(t.id));
      return {
        id: t.id,
        name: enrichedT.name,
        trainer_id: t.trainer_id,
        specialization: t.specialization,
        verified_count: verifications.filter(v => v.status === 'Verified').length,
        rejected_count: verifications.filter(v => v.status === 'Rejected').length,
        pending_count: enrichedT.pending_verifications_count,
        assigned_students: enrichedT.assigned_students_count
      };
    });

    // Attendance Trends (last 10 distinct dates)
    const dateMap = {};
    allAttendance.forEach(a => {
      if (!dateMap[a.date]) {
        dateMap[a.date] = { date: a.date, verified: 0, rejected: 0, pending: 0, total: 0 };
      }
      dateMap[a.date].total += 1;
      if (a.status === 'Verified') dateMap[a.date].verified += 1;
      else if (a.status === 'Rejected') dateMap[a.date].rejected += 1;
      else if (a.status === 'Pending Verification') dateMap[a.date].pending += 1;
    });

    const attendanceTrends = Object.values(dateMap)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-10);

    // Complaint categories distribution
    const categoryMap = {
      'Trainer': 0,
      'Attendance': 0,
      'Course': 0,
      'Infrastructure': 0,
      'Technical Issue': 0,
      'Other': 0
    };
    db.find('complaints').forEach(c => {
      if (categoryMap[c.category] !== undefined) {
        categoryMap[c.category] += 1;
      } else {
        categoryMap['Other'] += 1;
      }
    });

    // Attendance distribution per trainer
    const trainerDistribution = db.find('trainers').map(t => {
      const tAttendance = allAttendance.filter(a => String(a.trainer_id) === String(t.id));
      const tVerified = tAttendance.filter(a => a.status === 'Verified').length;
      const trainerUser = db.findById('users', t.user_id);
      return {
        trainer_name: trainerUser ? trainerUser.name : t.trainer_id,
        total: tAttendance.length,
        verified: tVerified,
        percentage: tAttendance.length > 0 ? Math.round((tVerified / tAttendance.length) * 100) : 100
      };
    });

    return res.json({
      success: true,
      data: {
        cards: {
          totalStudents,
          totalTrainers,
          activeCourses,
          todayAttendance: todayAttendance.length,
          pendingAttendance: pendingVerification.length,
          pendingStudentRegistrations,
          totalComplaints,
          openComplaints,
          underReviewComplaints,
          resolvedComplaints,
          overallAttendancePercentage,
          complaintResolutionRate
        },
        lowAttendanceStudents,
        trainerActivity: allTrainers,
        attendanceTrends,
        categoryDistribution: Object.entries(categoryMap).map(([category, count]) => ({ category, count })),
        trainerDistribution
      }
    });
  } catch (err) {
    console.error('Fetch admin analytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate admin analytics.' });
  }
});

// GET /api/analytics/trainer - Trainer Dashboard Analytics
router.get('/trainer', requireAuth, requireTrainer, (req, res) => {
  try {
    const trainer = db.findOne('trainers', t => String(t.user_id) === String(req.user.id));
    if (!trainer) {
      return res.status(404).json({ success: false, message: 'Trainer profile not found.' });
    }

    const todayStr = formatDate();
    const enriched = db.getEnrichedTrainer(trainer);

    const students = db.getTrainerStudents(trainer.id);
    const studentIds = students.map(s => String(s.id));

    const attendanceRecords = db.find('attendance', a => 
      String(a.trainer_id) === String(trainer.id) || studentIds.includes(String(a.student_id))
    );

    const todayAttendance = attendanceRecords.filter(a => a.date === todayStr);
    const pendingVerifications = attendanceRecords.filter(a => a.status === 'Pending Verification');
    const verifiedAttendance = attendanceRecords.filter(a => a.status === 'Verified');

    // Class time slots chosen by this trainer's students, earliest first
    const slotMap = {};
    students.forEach(s => {
      const timing = formatClassTiming(s.class_start_time, s.class_end_time);
      if (!timing) return;
      const key = `${s.class_start_time}-${s.class_end_time}`;
      if (!slotMap[key]) slotMap[key] = { start: s.class_start_time, end: s.class_end_time, class_timing: timing, student_count: 0, students: [] };
      slotMap[key].student_count += 1;
      const u = db.findById('users', s.user_id);
      slotMap[key].students.push(u ? u.name : s.student_id);
    });
    const todayClasses = Object.values(slotMap).sort((a, b) => a.start.localeCompare(b.start));
    const rejectedAttendance = attendanceRecords.filter(a => a.status === 'Rejected');

    const totalAttendance = attendanceRecords.length;
    const trainerAttendancePercentage = totalAttendance > 0 
      ? Math.round((verifiedAttendance.length / totalAttendance) * 100) 
      : 100;

    return res.json({
      success: true,
      data: {
        profile: enriched,
        cards: {
          assignedCourses: enriched.assigned_courses.length,
          assignedStudents: students.length,
          todayClasses: todayClasses.length,
          todayAttendance: todayAttendance.length,
          pendingVerifications: pendingVerifications.length,
          verifiedTotal: verifiedAttendance.length,
          rejectedTotal: rejectedAttendance.length,
          attendancePercentage: trainerAttendancePercentage
        },
        todayClasses,
        pendingRecords: pendingVerifications.slice(0, 5).map(a => db.getEnrichedAttendance(a))
      }
    });
  } catch (err) {
    console.error('Fetch trainer analytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate trainer analytics.' });
  }
});

// GET /api/analytics/student - Student Dashboard Analytics
router.get('/student', requireAuth, requireStudent, (req, res) => {
  try {
    const student = db.findOne('students', s => String(s.user_id) === String(req.user.id));
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const todayStr = formatDate();
    const enriched = db.getEnrichedStudent(student);
    const attendanceRecords = db.find('attendance', a => String(a.student_id) === String(student.id));

    const todayRecords = attendanceRecords.filter(a => a.date === todayStr).map(a => db.getEnrichedAttendance(a));
    const myComplaints = db.find('complaints', c => String(c.student_id) === String(student.id))
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({
      success: true,
      data: {
        profile: enriched,
        stats: enriched.stats,
        todayAttendance: todayRecords,
        recentAttendance: attendanceRecords
          .sort((a, b) => new Date(b.date + ' ' + (b.check_in_time || '')) - new Date(a.date + ' ' + (a.check_in_time || '')))
          .slice(0, 5)
          .map(a => db.getEnrichedAttendance(a)),
        complaints: {
          total: myComplaints.length,
          open: myComplaints.filter(c => c.status === 'Open' || c.status === 'Under Review').length,
          resolved: myComplaints.filter(c => c.status === 'Resolved' || c.status === 'Closed').length,
          recent: myComplaints.slice(0, 3).map(c => {
            const enc = db.getEnrichedComplaint(c);
            delete enc.admin_notes;
            return enc;
          })
        }
      }
    });
  } catch (err) {
    console.error('Fetch student analytics error:', err);
    return res.status(500).json({ success: false, message: 'Failed to generate student dashboard.' });
  }
});

export default router;
