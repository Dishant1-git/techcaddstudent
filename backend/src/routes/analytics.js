import express from 'express';
import { db, formatClassTiming, toDateStr, addDays } from '../db/database.js';
import { requireAuth, requireAdmin, requireTrainer, requireStudent } from '../middleware/auth.js';

const router = express.Router();

function formatDate(date = new Date()) {
  return toDateStr(date);
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
    const openAbsenceAlerts = db.count('absence_alerts', a => a.status === 'open');
    const pendingLeaves = db.count('leaves', l => l.status === 'pending');
    const enrollmentCounts = { running: 0, hold: 0, completed: 0, dropped: 0 };
    allEnrichedStudents.forEach(s => { enrollmentCounts[s.enrollment_status] = (enrollmentCounts[s.enrollment_status] || 0) + 1; });

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
          openAbsenceAlerts,
          pendingLeaves,
          runningStudents: enrollmentCounts.running,
          holdStudents: enrollmentCounts.hold,
          completedStudents: enrollmentCounts.completed,
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

// GET /api/analytics/student-report?from=YYYY-MM-DD&to=YYYY-MM-DD - Admin student data sheet
router.get('/student-report', requireAuth, requireAdmin, (req, res) => {
  try {
    const today = toDateStr();
    const from = /^\d{4}-\d{2}-\d{2}$/.test(req.query.from || '') ? req.query.from : addDays(today, -29);
    const to = /^\d{4}-\d{2}-\d{2}$/.test(req.query.to || '') ? req.query.to : today;
    const inRange = d => d && d >= from && d <= to;

    const students = db.find('students').map(s => db.getEnrichedStudent(s))
      .filter(s => s.status !== 'pending_approval' && s.status !== 'rejected');

    const rows = students.map(s => {
      const records = db.find('attendance', a => String(a.student_id) === String(s.id) && inRange(a.date));
      const verified = records.filter(a => a.status === 'Verified').length;
      const leaveDays = db.find('leaves', l => String(l.student_id) === String(s.id) && l.status === 'approved' && l.from_date <= to && l.to_date >= from).length;
      return {
        id: s.id,
        student_id: s.student_id,
        name: s.name,
        email: s.email,
        phone: s.phone,
        course_name: s.course_name,
        domain: s.domain,
        program_label: s.program_label,
        program_type: s.program_type,
        program_duration: s.program_duration,
        expected_end_date: s.expected_end_date,
        hours_completed: s.hours_completed,
        trainer_name: s.trainer_name,
        class_timing: s.class_timing,
        joined_on: s.joined_on,
        enrollment_status: s.enrollment_status,
        completed_on: s.completed_on || null,
        account_status: s.status,
        period_classes: records.length,
        period_verified: verified,
        period_pending: records.filter(a => a.status === 'Pending Verification').length,
        period_rejected: records.filter(a => a.status === 'Rejected').length,
        period_percentage: records.length > 0 ? Math.round((verified / records.length) * 100) : null,
        overall_percentage: s.stats.attendancePercentage,
        overall_classes: s.stats.totalClasses,
        last_attendance_date: s.last_attendance_date,
        absent_streak: s.absent_streak,
        approved_leaves: leaveDays
      };
    });

    const count = (list, fn) => list.filter(fn).length;
    const newJoined = rows.filter(r => inRange(r.joined_on));
    const completedInPeriod = rows.filter(r => r.enrollment_status === 'completed' && inRange(r.completed_on));
    const withClasses = rows.filter(r => r.period_classes > 0);
    const periodAttendance = withClasses.length > 0
      ? Math.round(withClasses.reduce((sum, r) => sum + r.period_percentage, 0) / withClasses.length)
      : null;

    const group = (key) => {
      const map = {};
      rows.forEach(r => {
        const k = r[key] || 'Not Set';
        map[k] ??= { name: k, total: 0, running: 0, hold: 0, completed: 0, dropped: 0, new_joined: 0, classes: 0, verified: 0 };
        const g = map[k];
        g.total += 1;
        g[r.enrollment_status] += 1;
        if (inRange(r.joined_on)) g.new_joined += 1;
        g.classes += r.period_classes;
        g.verified += r.period_verified;
      });
      return Object.values(map)
        .map(g => ({ ...g, attendance_percentage: g.classes > 0 ? Math.round((g.verified / g.classes) * 100) : null }))
        .sort((a, b) => b.total - a.total);
    };

    // New joinings per month (all time, for the trend)
    const monthMap = {};
    rows.forEach(r => {
      const m = (r.joined_on || '').slice(0, 7);
      if (!m) return;
      monthMap[m] ??= { month: m, joined: 0, completed: 0 };
      monthMap[m].joined += 1;
    });
    rows.forEach(r => {
      const m = (r.completed_on || '').slice(0, 7);
      if (!m) return;
      monthMap[m] ??= { month: m, joined: 0, completed: 0 };
      monthMap[m].completed += 1;
    });

    return res.json({
      success: true,
      data: {
        period: { from, to },
        generated_at: new Date().toISOString(),
        summary: {
          totalStudents: rows.length,
          newJoined: newJoined.length,
          running: count(rows, r => r.enrollment_status === 'running'),
          hold: count(rows, r => r.enrollment_status === 'hold'),
          completed: count(rows, r => r.enrollment_status === 'completed'),
          completedInPeriod: completedInPeriod.length,
          dropped: count(rows, r => r.enrollment_status === 'dropped'),
          periodAttendance,
          lowAttendance: count(rows, r => r.period_percentage !== null && r.period_percentage < 75),
          absentNow: count(rows, r => r.absent_streak >= 3),
          openAbsenceAlerts: db.count('absence_alerts', a => a.status === 'open'),
          approvedLeaves: db.count('leaves', l => l.status === 'approved' && l.from_date <= to && l.to_date >= from),
          pendingLeaves: db.count('leaves', l => l.status === 'pending')
        },
        byCourse: group('course_name'),
        byTrainer: group('trainer_name'),
        byProgram: group('program_label'),
        monthly: Object.values(monthMap).sort((a, b) => a.month.localeCompare(b.month)),
        students: rows.sort((a, b) => (b.joined_on || '').localeCompare(a.joined_on || ''))
      }
    });
  } catch (err) {
    console.error('Student report error:', err);
    return res.status(500).json({ success: false, message: 'Failed to build student report.' });
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
