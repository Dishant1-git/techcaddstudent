import { db, toDateStr } from './db/database.js';

// Consecutive working days without attendance before the admin and trainer are alerted
export const ABSENCE_THRESHOLD = Number(process.env.ABSENCE_ALERT_DAYS) || 3;
const CHECK_INTERVAL_MS = 30 * 60 * 1000;

function studentLabel(student) {
  const user = db.findById('users', student.user_id);
  return { user, name: user ? user.name : student.student_id };
}

function notifyAdmins(title, message) {
  db.find('users', u => u.role === 'admin' && u.status === 'active').forEach(admin => {
    db.insert('notifications', {
      user_id: admin.id,
      title,
      message,
      type: 'absence_alert',
      link: '/admin/absences',
      is_read: false
    });
  });
}

function notifyTrainer(trainerId, title, message) {
  const trainer = trainerId ? db.findById('trainers', trainerId) : null;
  if (!trainer) return;
  db.insert('notifications', {
    user_id: trainer.user_id,
    title,
    message,
    type: 'absence_alert',
    link: '/trainer/students',
    is_read: false
  });
}

export function resolveAlert(alert, reason, resolvedBy = null) {
  return db.update('absence_alerts', alert.id, {
    status: 'resolved',
    resolved_reason: reason,
    resolved_by: resolvedBy,
    resolved_at: new Date().toISOString()
  });
}

// Checks one student and opens, refreshes, or resolves their absence alert
export function checkStudentAbsence(student, todayStr = toDateStr()) {
  const user = db.findById('users', student.user_id);
  const enrollment = student.enrollment_status || 'running';
  const openAlert = db.findOne('absence_alerts', a => String(a.student_id) === String(student.id) && a.status === 'open');

  if (!user || user.status !== 'active' || enrollment !== 'running') {
    if (openAlert) resolveAlert(openAlert, 'status_changed');
    return null;
  }

  const streak = db.getAbsenceStreak(student, todayStr);

  if (streak.days < ABSENCE_THRESHOLD) {
    if (openAlert) {
      const onLeave = db.getApprovedLeaveOn(student.id, openAlert.last_absent_date) ||
        db.getApprovedLeaveOn(student.id, streak.last || todayStr);
      resolveAlert(openAlert, onLeave ? 'leave_approved' : 'attended');
    }
    return null;
  }

  const { name } = studentLabel(student);
  // An alert belongs to one streak, identified by the streak's first absent day
  const sameStreak = db.findOne('absence_alerts', a =>
    String(a.student_id) === String(student.id) && a.first_absent_date === streak.first
  );

  if (sameStreak && sameStreak.status !== 'open') return sameStreak; // dismissed by admin

  if (!sameStreak) {
    if (openAlert) resolveAlert(openAlert, 'attended');
    const alert = db.insert('absence_alerts', {
      student_id: student.id,
      trainer_id: student.trainer_id || null,
      first_absent_date: streak.first,
      last_absent_date: streak.last,
      absent_days: streak.days,
      absent_dates: streak.dates,
      status: 'open',
      last_notified_date: todayStr
    });
    const msg = `${name} has not attended for ${streak.days} working days in a row (${streak.first} to ${streak.last}).`;
    notifyAdmins(`Student Absent ${ABSENCE_THRESHOLD}+ Days`, `${msg} Approve a leave to stop these alerts.`);
    notifyTrainer(student.trainer_id, 'Your Student Is Absent', msg);
    return alert;
  }

  const updates = {
    last_absent_date: streak.last,
    absent_days: streak.days,
    absent_dates: streak.dates,
    trainer_id: student.trainer_id || null
  };
  // Daily reminder until the student attends or a leave is approved
  if (sameStreak.last_notified_date !== todayStr) {
    updates.last_notified_date = todayStr;
    notifyAdmins(
      'Reminder: Student Still Absent',
      `${name} has now been absent for ${streak.days} working days (since ${streak.first}). Approve a leave to stop these reminders.`
    );
    if (streak.days > sameStreak.absent_days) {
      notifyTrainer(student.trainer_id, 'Student Still Absent', `${name} has been absent for ${streak.days} working days.`);
    }
  }
  return db.update('absence_alerts', sameStreak.id, updates);
}

export function runAbsenceCheck(now = new Date()) {
  const todayStr = toDateStr(now);
  let open = 0;
  for (const student of db.find('students')) {
    const alert = checkStudentAbsence(student, todayStr);
    if (alert && alert.status === 'open') open += 1;
  }
  return { checkedAt: now.toISOString(), openAlerts: open };
}

export function getEnrichedAlert(alert) {
  const student = db.findById('students', alert.student_id);
  const enriched = student ? db.getEnrichedStudent(student) : null;
  return {
    ...alert,
    student_name: enriched ? enriched.name : 'Unknown Student',
    student_code: enriched ? enriched.student_id : 'N/A',
    student_email: enriched ? enriched.email : '',
    student_phone: enriched ? enriched.phone : '',
    trainer_name: enriched ? enriched.trainer_name : 'N/A',
    class_timing: enriched ? enriched.class_timing : '',
    current_streak: enriched ? enriched.absent_streak : 0
  };
}

let timer = null;
export function startAbsenceMonitor() {
  if (timer) return;
  const run = () => {
    try {
      const result = runAbsenceCheck();
      if (result.openAlerts > 0) console.log(`[Absence] ${result.openAlerts} open absence alert(s)`);
    } catch (err) {
      console.error('[Absence] Check failed:', err);
    }
  };
  run();
  timer = setInterval(run, CHECK_INTERVAL_MS);
  timer.unref();
}
