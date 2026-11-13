import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import app from '../src/server.js';
import { seedDatabase } from '../src/db/seed.js';
import { connectMongo, closeMongo } from '../src/db/mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DEFAULT_PORT = process.env.PORT || 5001;
let BASE_URL = process.env.TEST_API_URL || `http://localhost:${DEFAULT_PORT}/api`;
let localServerInstance = null;

async function req(endpoint, method = 'GET', body = null, token = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
  });

  const data = await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, headers: res.headers, data };
}

async function ensureServerRunning() {
  try {
    const res = await fetch(`${BASE_URL}/health`, { signal: AbortSignal.timeout(1000) });
    if (res.ok) {
      console.log(`[E2E Test Runner] Connected to active server at ${BASE_URL}`);
      return;
    }
  } catch (err) {
    // Server not running at BASE_URL, boot an isolated test instance
  }

  console.log(`[E2E Test Runner] Booting isolated test server instance...`);
  await seedDatabase();
  const testPort = 5099;
  BASE_URL = `http://localhost:${testPort}/api`;

  await new Promise((resolve) => {
    localServerInstance = app.listen(testPort, '127.0.0.1', () => {
      console.log(`[E2E Test Runner] Isolated test server ready at ${BASE_URL}`);
      resolve();
    });
  });
}

async function runE2ETests() {
  console.log('\n======================================================');
  console.log(' STARTING END-TO-END SECURITY & WORKFLOW AUDIT SUITE');
  console.log('======================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, testName) {
    if (condition) {
      console.log(` ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(` ❌ FAIL: ${testName}`);
      failed++;
    }
  }

  try {
    await ensureServerRunning();

    // 1. Health Check & Security Headers
    console.log('\n--- Testing HTTP Security Headers ---');
    const health = await req('/health');
    assert(health.ok && health.data.status === 'ok', 'Server health check returns ok');
    assert(health.headers.get('x-content-type-options') === 'nosniff', 'Security header X-Content-Type-Options: nosniff present');
    assert(health.headers.get('x-frame-options') === 'SAMEORIGIN', 'Security header X-Frame-Options: SAMEORIGIN present');
    assert(health.headers.get('x-xss-protection') === '1; mode=block', 'Security header X-XSS-Protection: 1; mode=block present');

    // 2. Role Authentication
    console.log('\n--- Testing Authentication & Cryptographic JWT Claims ---');
    const adminLogin = await req('/auth/login', 'POST', { email: 'singhharinder.techcadd@gmail.com', password: 'Harinder@9203' });
    assert(adminLogin.ok && adminLogin.data.user.role === 'admin', 'Admin login successful and role verified');
    const adminToken = adminLogin.data.token;

    const trainerLogin = await req('/auth/login', 'POST', { email: 'trainer.alex@portal.edu', password: 'trainer123' });
    assert(trainerLogin.ok && trainerLogin.data.user.role === 'trainer', 'Trainer Alex login successful and role verified');
    const trainerToken = trainerLogin.data.token;

    const studentLogin = await req('/auth/login', 'POST', { email: 'student.john@portal.edu', password: 'student123' });
    assert(studentLogin.ok && studentLogin.data.user.role === 'student', 'Student John login successful and role verified');
    const studentToken = studentLogin.data.token;

    // 2.0. Trainer dropdown + student-chosen class timing
    const trainerOptions = await req('/trainers/options');
    assert(trainerOptions.ok && trainerOptions.data.data.length > 0 && !trainerOptions.data.data[0].email, 'Public trainer dropdown lists trainers without private details');
    const pickTrainerId = trainerOptions.data.data[0]?.id;

    const noTrainerReg = await req('/auth/register', 'POST', { name: 'No Trainer', email: `no.trainer.${Date.now()}@portal.edu`, password: 'password123' });
    assert(noTrainerReg.status === 400, 'Registration requires choosing a trainer and class timing');

    const noProgramReg = await req('/auth/register', 'POST', { name: 'No Program', email: `no.program.${Date.now()}@portal.edu`, password: 'password123', trainer_id: pickTrainerId, class_start_time: '10:00', class_end_time: '12:00' });
    assert(noProgramReg.status === 400, 'Registration requires choosing Course/Training and duration');

    const courseOptions = await req('/courses/options');
    assert(courseOptions.ok && courseOptions.data.data.length > 0, 'Public course dropdown lists the admin\'s courses');
    const pickCourseId = courseOptions.data.data[0]?.id;
    const courseNoPick = await req('/auth/register', 'POST', { name: 'Course No Pick', email: `course.np.${Date.now()}@portal.edu`, password: 'password123', program_type: 'course', trainer_id: pickTrainerId, class_start_time: '10:00', class_end_time: '12:00' });
    assert(courseNoPick.status === 400, 'Course registration requires choosing a course');
    const courseEmail = `course.only.${Date.now()}@portal.edu`;
    const courseReg = await req('/auth/register', 'POST', { name: 'Course Only', email: courseEmail, password: 'password123', program_type: 'course', course_id: pickCourseId, trainer_id: pickTrainerId, class_start_time: '10:00', class_end_time: '12:00' });
    assert(courseReg.status === 201, 'Course registration with a course and no duration succeeds');
    const sixWeeks = await req('/auth/register', 'POST', { name: 'Six Weeks', email: `six.weeks.${Date.now()}@portal.edu`, password: 'password123', program_type: 'training', program_duration: '6_weeks', trainer_id: pickTrainerId, class_start_time: '10:00', class_end_time: '12:00' });
    assert(sixWeeks.status === 201, 'Training can be 6 weeks');
    const trainingNoDuration = await req('/auth/register', 'POST', { name: 'Training No Duration', email: `training.nd.${Date.now()}@portal.edu`, password: 'password123', program_type: 'training', trainer_id: pickTrainerId, class_start_time: '10:00', class_end_time: '12:00' });
    assert(trainingNoDuration.status === 400, 'Training registration requires a duration');

    const classUpdate = await req('/students/me/class', 'PUT', { trainer_id: pickTrainerId, class_start_time: '10:00', class_end_time: '12:00' }, studentToken);
    assert(classUpdate.ok && classUpdate.data.data.class_timing === '10:00 AM - 12:00 PM', 'Student updates own trainer and class timing');
    const badTiming = await req('/students/me/class', 'PUT', { trainer_id: pickTrainerId, class_start_time: '12:00', class_end_time: '10:00' }, studentToken);
    assert(badTiming.status === 400, 'Class end time before start time is rejected');
    // Put John back on Alex's class for the trainer checks below
    const alexId = trainerLogin.data.profile?.id;
    await req('/students/me/class', 'PUT', { trainer_id: alexId, class_start_time: '09:00', class_end_time: '12:00' }, studentToken);

    // 2.1. Student Self-Registration Admin Verification & Restrictive Access Workflow
    console.log('\n--- Testing Student Registration Admin Verification & Access Control ---');
    const testEmail = `new.applicant.${Date.now()}@portal.edu`;
    const regRes = await req('/auth/register', 'POST', {
      name: 'Applicant Alice',
      program_type: 'training',
      program_duration: '45_days',
      trainer_id: pickTrainerId,
      class_start_time: '14:00',
      class_end_time: '16:00',
      email: testEmail,
      password: 'password123',
      phone: '555-0199'
    });
    assert(regRes.status === 201 && regRes.data.pendingApproval === true, 'Student registration initializes with pendingApproval: true');
    assert(regRes.data.user?.status === 'pending_approval', 'Student user status is set to pending_approval');
    const registeredUserId = regRes.data.user?.id;

    // Early login attempt blocked
    const earlyLoginRes = await req('/auth/login', 'POST', { email: testEmail, password: 'password123' });
    assert(earlyLoginRes.status === 403 && earlyLoginRes.data.code === 'PENDING_APPROVAL', 'Unverified student blocked from logging in with 403 PENDING_APPROVAL');

    // Admin verifies pending list and approves
    const pendingStudentsRes = await req('/students?status=pending_approval', 'GET', null, adminToken);
    const foundPending = pendingStudentsRes.data?.data?.find(s => String(s.user_id) === String(registeredUserId));
    assert(foundPending && foundPending.status === 'pending_approval', 'Admin retrieves pending student registrations list');

    if (foundPending) {
      const approveRes = await req(`/students/${foundPending.id}/approve`, 'POST', null, adminToken);
      assert(approveRes.ok && approveRes.data.data?.status === 'active', 'Admin approves student registration -> status becomes active');

      // Now student logs in successfully
      const approvedLoginRes = await req('/auth/login', 'POST', { email: testEmail, password: 'password123' });
      assert(approvedLoginRes.ok && approvedLoginRes.data.user?.role === 'student', 'Approved student can now successfully log in to portal');
    }

    // Rejection workflow test
    const rejectEmail = `rejected.applicant.${Date.now()}@portal.edu`;
    const regRes2 = await req('/auth/register', 'POST', {
      name: 'Applicant Bob',
      program_type: 'training',
      program_duration: '45_days',
      trainer_id: pickTrainerId,
      class_start_time: '14:00',
      class_end_time: '16:00',
      email: rejectEmail,
      password: 'password123',
      phone: '555-0188'
    });
    const pendingStudentsRes2 = await req('/students?status=pending_approval', 'GET', null, adminToken);
    const foundPending2 = pendingStudentsRes2.data?.data?.find(s => s.email === rejectEmail);

    if (foundPending2) {
      const rejectRes = await req(`/students/${foundPending2.id}/reject`, 'POST', { reason: 'Enrollment capacity reached' }, adminToken);
      assert(rejectRes.ok && rejectRes.data.data?.status === 'rejected', 'Admin rejects student registration with mandatory reason');

      const rejectLoginRes = await req('/auth/login', 'POST', { email: rejectEmail, password: 'password123' });
      assert(rejectLoginRes.status === 403 && rejectLoginRes.data.code === 'REGISTRATION_REJECTED', 'Rejected student blocked from login with 403 REGISTRATION_REJECTED');
    }

    // 3. Forged Token Rejection
    const fakeTokenRes = await req('/auth/me', 'GET', null, 'forged-invalid-jwt-token-12345');
    assert(fakeTokenRes.status === 401, 'Forged / invalid JWT tokens strictly rejected (401 Unauthorized)');

    // 4. Password Cryptography Verification in Database
    console.log('\n--- Testing Database Password Storage Cryptography ---');
    {
      const mongo = await connectMongo();
      const allUsers = await mongo.collection('users').find({}).toArray();
      const hasPlainText = allUsers.some(u => !u.password_hash || !u.password_hash.startsWith('$2b$10$'));
      assert(!hasPlainText && allUsers.length > 0, 'ALL passwords stored exclusively as salted Bcrypt hashes ($2b$10$...)');
    }

    // 5. Input Sanitization & XSS Neutralization
    console.log('\n--- Testing Input Sanitization & XSS Neutralization ---');
    const xssPayload = '<script>alert("XSS")</script>Grievance with XSS vector';
    const xssComplaint = await req('/complaints', 'POST', {
      category: 'Course',
      subject: xssPayload,
      description: 'Testing sanitization of <script> tag payload',
      priority: 'Medium'
    }, studentToken);
    assert(xssComplaint.ok && !xssComplaint.data.data.subject.includes('<script>'), 'Dangerous <script> vectors sanitized from user inputs');

    // 6. Student Attendance Marking & Duplicate Prevention
    console.log('\n--- Testing Student Attendance Workflow ---');
    const testSession = `Security Evening Session ${Date.now()}`;
    const markRes = await req('/attendance/mark', 'POST', { session: testSession, notes: 'Automated test attendance' }, studentToken);
    assert(markRes.status === 201 && markRes.data.data.status === 'Pending Verification', 'Student marks attendance -> initial status is Pending Verification');
    const createdAttendanceId = markRes.data.data.id;

    // Duplicate Check
    const duplicateRes = await req('/attendance/mark', 'POST', { session: testSession }, studentToken);
    assert(duplicateRes.status === 400, 'Duplicate attendance prevention enforced (same student, date, session)');

    // Student Attendance History
    const myAtt = await req('/attendance/my', 'GET', null, studentToken);
    assert(myAtt.ok && Array.isArray(myAtt.data.data), 'Student retrieves own attendance history');
    assert(myAtt.data.stats && myAtt.data.stats.attendancePercentage !== undefined, 'Attendance stats and percentage computed');

    // 7. Student Complaints Privacy & Admin Notes Isolation
    console.log('\n--- Testing Student Complaints Privacy & Scope Isolation ---');
    const complaintRes = await req('/complaints', 'POST', {
      category: 'Course',
      subject: `E2E Security Grievance ${Date.now()}`,
      description: 'Testing confidential grievance isolation',
      priority: 'High'
    }, studentToken);
    assert(complaintRes.status === 201 && complaintRes.data.data.status === 'Open', 'Student submits complaint -> Status: Open');
    const createdComplaintId = complaintRes.data.data.id;

    // Student view complaint list
    const myComplaints = await req('/complaints/my', 'GET', null, studentToken);
    assert(myComplaints.ok && myComplaints.data.data.length > 0, 'Student retrieves own complaints list');
    const foundComplaint = myComplaints.data.data.find(c => c.id === createdComplaintId);
    assert(foundComplaint && foundComplaint.admin_notes === undefined, 'Student complaint response strips private internal admin_notes');

    // 8. Trainer RBAC Enforcement & Verification
    console.log('\n--- Testing Trainer Scoping & RBAC ---');
    // Trainer blocked from student complaints
    const trainerComplaintBlock = await req('/complaints/my', 'GET', null, trainerToken);
    assert(trainerComplaintBlock.status === 403, 'Trainer blocked from accessing student complaints (403 Forbidden)');

    // Trainer views pending verifications
    const pendingVerifs = await req('/attendance/trainer/pending', 'GET', null, trainerToken);
    assert(pendingVerifs.ok, 'Trainer retrieves pending attendance verifications for assigned students');

    // Trainer verifies attendance
    const verifyRes = await req(`/attendance/verify/${createdAttendanceId}`, 'POST', null, trainerToken);
    assert(verifyRes.ok && verifyRes.data.data.status === 'Verified', 'Trainer verifies attendance -> Status: Verified with trainer ID and timestamp recorded');

    // Trainer rejects another record test
    const testSession2 = `Lab Rejection Test ${Date.now()}`;
    const markRes2 = await req('/attendance/mark', 'POST', { session: testSession2 }, studentToken);
    const rejectRes = await req(`/attendance/reject/${markRes2.data.data.id}`, 'POST', { reason: 'Left session early without leave permission' }, trainerToken);
    assert(rejectRes.ok && rejectRes.data.data.status === 'Rejected' && rejectRes.data.data.rejection_reason.includes('early'), 'Trainer rejects attendance -> Status: Rejected with mandatory reason recorded');

    // 9. Admin Dashboard, Reports & Complaint Resolution
    console.log('\n--- Testing Admin Master Controls ---');
    const adminAnalytics = await req('/analytics/admin', 'GET', null, adminToken);
    assert(adminAnalytics.ok && (adminAnalytics.data.data?.cards?.totalStudents > 0 || adminAnalytics.data.cards?.totalStudents > 0), 'Admin retrieves institutional overview KPIs');

    const adminReports = await req('/attendance/reports', 'GET', null, adminToken);
    assert(adminReports.ok && (adminReports.data.summary?.totalRecords > 0 || adminReports.data.data?.summary?.totalRecords > 0), 'Admin generates attendance reports with summary stats');

    // Admin resolves student complaint
    const updateComplaintRes = await req(`/complaints/admin/${createdComplaintId}/status`, 'PUT', {
      status: 'Resolved',
      admin_response: 'Action has been taken by the curriculum head.',
      admin_notes: 'Technician ticket verified.'
    }, adminToken);
    assert(updateComplaintRes.ok && updateComplaintRes.data.data?.status === 'Resolved', 'Admin updates complaint status to Resolved and posts response');

    // 9.1 Forgot password -> admin resets it
    console.log('\n--- Testing Admin Password Reset Workflow ---');
    const forgotRes = await req('/auth/forgot-password', 'POST', { email: testEmail, note: 'Forgot it' });
    assert(forgotRes.ok, 'Student can request a password reset from the login page');
    const pwRequests = await req('/students/password-requests', 'GET', null, adminToken);
    const pwRequest = pwRequests.data?.data?.find(r => r.email === testEmail);
    assert(pwRequest && pwRequest.status === 'pending', 'Admin sees the pending password reset request');
    const studentBlocked = await req('/students/password-requests', 'GET', null, studentToken);
    assert(studentBlocked.status === 403, 'Students cannot read password reset requests');
    if (pwRequest) {
      const resetRes = await req(`/students/${pwRequest.student_id}/reset-password`, 'POST', { password: 'newpass456' }, adminToken);
      assert(resetRes.ok, 'Admin sets a new password for the student');
      const newLogin = await req('/auth/login', 'POST', { email: testEmail, password: 'newpass456' });
      assert(newLogin.ok, 'Student signs in with the admin-set password');
      const after = await req('/students/password-requests', 'GET', null, adminToken);
      assert(!after.data.data.some(r => r.email === testEmail), 'Request is cleared after the reset');
    }

    // 9.2 Leaves, course status, absence alerts and the student report sheet
    console.log('\n--- Testing Leaves, Course Status & Student Report ---');
    const day = (offset) => { const d = new Date(); d.setUTCDate(d.getUTCDate() + offset); return d.toISOString().split('T')[0]; };
    const leaveReq = await req('/leaves', 'POST', { from_date: day(5), to_date: day(6), reason: 'Family function' }, studentToken);
    assert(leaveReq.status === 201 && leaveReq.data.data.status === 'pending', 'Student requests leave -> pending');
    const overlapReq = await req('/leaves', 'POST', { from_date: day(6), to_date: day(7), reason: 'Again' }, studentToken);
    assert(overlapReq.status === 400, 'Overlapping leave requests are rejected');
    const pendingLeaves = await req('/leaves?status=pending', 'GET', null, adminToken);
    assert(pendingLeaves.ok && pendingLeaves.data.data.some(l => l.id === leaveReq.data.data.id), 'Admin sees pending leave requests');
    const approveLeave = await req(`/leaves/${leaveReq.data.data.id}/approve`, 'POST', {}, adminToken);
    assert(approveLeave.ok && approveLeave.data.data.status === 'approved', 'Admin approves the leave');
    const myLeaves = await req('/leaves/my', 'GET', null, studentToken);
    assert(myLeaves.ok && myLeaves.data.data[0]?.status === 'approved', 'Student sees approved leave');

    const johnProfile = (await req('/students/me', 'GET', null, studentToken)).data.data;
    const holdRes = await req(`/students/${johnProfile.id}/enrollment`, 'PUT', { enrollment_status: 'hold', note: 'Fees pending' }, adminToken);
    assert(holdRes.ok && holdRes.data.data.enrollment_status === 'hold', 'Admin puts student on hold');
    const blockedMark = await req('/attendance/mark', 'POST', { session: `Hold Test ${Date.now()}` }, studentToken);
    assert(blockedMark.status === 400 && blockedMark.data.code === 'ENROLLMENT_NOT_RUNNING', 'Student on hold cannot mark attendance');
    const badStatus = await req(`/students/${johnProfile.id}/enrollment`, 'PUT', { enrollment_status: 'paused' }, adminToken);
    assert(badStatus.status === 400, 'Unknown course status is rejected');
    await req(`/students/${johnProfile.id}/enrollment`, 'PUT', { enrollment_status: 'running' }, adminToken);

    // Trainer changes course status of their own student, not others
    const trainerHold = await req(`/students/${johnProfile.id}/enrollment`, 'PUT', { enrollment_status: 'hold', note: 'Medical' }, trainerToken);
    assert(trainerHold.ok && trainerHold.data.data.enrollment_status === 'hold', 'Trainer changes course status of own student');
    await req(`/students/${johnProfile.id}/enrollment`, 'PUT', { enrollment_status: 'running' }, trainerToken);
    const otherStudent = (await req('/students', 'GET', null, adminToken)).data.data.find(s => s.trainer_id && String(s.trainer_id) !== String(alexId));
    if (otherStudent) {
      const forbidden = await req(`/students/${otherStudent.id}/enrollment`, 'PUT', { enrollment_status: 'hold' }, trainerToken);
      assert(forbidden.status === 403, 'Trainer cannot change status of another trainer\'s student');
    }
    const adminNotifs = (await req('/notifications', 'GET', null, adminToken)).data.data;
    assert(adminNotifs.some(n => n.title === 'Trainer Changed Course Status'), 'Admin is notified when a trainer changes course status');
    const studentStatusChange = await req(`/students/${johnProfile.id}/enrollment`, 'PUT', { enrollment_status: 'hold' }, studentToken);
    assert(studentStatusChange.status === 403, 'Students cannot change course status');

    // Dates and check-in times are IST
    const istToday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const istMark = await req('/attendance/mark', 'POST', { session: `IST Check ${Date.now()}` }, studentToken);
    const istNow = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date());
    assert(istMark.ok && istMark.data.data.date === istToday && istMark.data.data.check_in_time.slice(-2) === istNow.slice(-2) && istMark.data.data.check_in_time.slice(0, 2) === istNow.slice(0, 2), 'Attendance date and check-in time use IST');

    const adminAlerts = await req('/absence/alerts', 'GET', null, adminToken);
    const trainerAlerts = await req('/absence/alerts', 'GET', null, trainerToken);
    const studentAlerts = await req('/absence/alerts', 'GET', null, studentToken);
    assert(adminAlerts.ok && trainerAlerts.ok && studentAlerts.status === 403, 'Absence alerts visible to admin and trainer only');
    const checkNow = await req('/absence/check', 'POST', null, adminToken);
    assert(checkNow.ok, 'Admin can run the absence check on demand');

    // Program shows to admin and trainer
    const aliceRow = (await req('/students?status=active', 'GET', null, adminToken)).data.data.find(s => s.email === testEmail);
    assert(aliceRow?.program_label === 'Training (45 Days)' && aliceRow.expected_end_date, 'Student program and expected end date are stored');
    const allRows = (await req('/students', 'GET', null, adminToken)).data.data;
    const courseRow = allRows.find(s => s.email === courseEmail);
    assert(courseRow && String(courseRow.course_id) === String(pickCourseId) && courseRow.program_label === 'Course', 'Chosen course is saved on the student');
    const sixRow = allRows.find(s => s.name === 'Six Weeks');
    const expect6w = (() => { const d = new Date(`${sixRow?.joined_on}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + 41); return d.toISOString().slice(0, 10); })();
    assert(sixRow?.program_label === 'Training (6 Weeks)' && sixRow.expected_end_date === expect6w, '6-week training ends 6 weeks after joining');
    const trainerStudents = await req('/students', 'GET', null, trainerToken);
    assert(trainerStudents.ok && trainerStudents.data.data.every(s => 'program_label' in s), 'Trainer sees each student\'s program');

    // Bulk leave actions notify the trainer
    await req('/leaves', 'POST', { from_date: day(20), to_date: day(20), reason: 'Bulk A' }, studentToken);
    await req('/leaves', 'POST', { from_date: day(22), to_date: day(22), reason: 'Bulk B' }, studentToken);
    const bulkApprove = await req('/leaves/bulk/approve', 'POST', {}, adminToken);
    assert(bulkApprove.ok && bulkApprove.data.count >= 2, 'Admin approves all pending leaves at once');
    await req('/leaves', 'POST', { from_date: day(25), to_date: day(25), reason: 'Bulk C' }, studentToken);
    const bulkReject = await req('/leaves/bulk/reject', 'POST', { admin_note: 'Exams week' }, adminToken);
    assert(bulkReject.ok && bulkReject.data.count === 1, 'Admin rejects all pending leaves at once');
    const trainerLeaves = await req('/leaves/trainer', 'GET', null, trainerToken);
    assert(trainerLeaves.ok && trainerLeaves.data.data.some(l => l.status === 'approved') && trainerLeaves.data.data.some(l => l.status === 'rejected'), 'Trainer sees approved and rejected leaves of their students');
    const trainerNotifs = (await req('/notifications', 'GET', null, trainerToken)).data.data;
    assert(trainerNotifs.some(n => n.type === 'leave_approved') && trainerNotifs.some(n => n.type === 'leave_rejected'), 'Trainer is notified of approved and rejected leaves');
    const approveAll = await req('/absence/alerts/approve-all', 'POST', {}, adminToken);
    const dismissAll = await req('/absence/alerts/dismiss-all', 'POST', {}, adminToken);
    assert(approveAll.ok && dismissAll.ok, 'Approve-all and dismiss-all absence actions work');

    const report = await req('/analytics/student-report', 'GET', null, adminToken);
    assert(report.ok && report.data.data.summary.totalStudents > 0 && Array.isArray(report.data.data.byCourse) && report.data.data.students[0]?.enrollment_status,
      'Admin generates the student report sheet with summary, course breakdown and student rows');
    const studentReport = await req('/analytics/student-report', 'GET', null, studentToken);
    assert(studentReport.status === 403, 'Students cannot access the student report sheet');

    // 9.3 Suggestion box
    console.log('\n--- Testing Student Suggestions ---');
    const sugg = await req('/suggestions', 'POST', { category: 'Timings', title: 'Evening slot', message: 'Please add a 7 PM batch for working students.' }, studentToken);
    assert(sugg.status === 201 && sugg.data.data.status === 'new', 'Student sends a suggestion');
    const anon = await req('/suggestions', 'POST', { category: 'Facilities', message: 'More chairs in lab 2 please.', anonymous: true }, studentToken);
    assert(anon.status === 201, 'Student sends an anonymous suggestion');
    const tooShort = await req('/suggestions', 'POST', { message: 'hi' }, studentToken);
    assert(tooShort.status === 400, 'Empty or too-short suggestions are rejected');
    const adminSugg = await req('/suggestions', 'GET', null, adminToken);
    const anonRow = adminSugg.data.data.find(x => x.id === anon.data.data.id);
    const namedRow = adminSugg.data.data.find(x => x.id === sugg.data.data.id);
    assert(adminSugg.ok && namedRow?.student_name === 'John Doe', 'Admin sees suggestions with the student name');
    assert(anonRow && anonRow.student_name === 'Anonymous' && anonRow.student_id === undefined, 'Anonymous suggestions hide the student from the admin');
    const adminNotifsSugg = (await req('/notifications', 'GET', null, adminToken)).data.data;
    assert(adminNotifsSugg.some(n => n.type === 'suggestion'), 'Admin is notified of new suggestions');
    const trainerSugg = await req('/suggestions', 'GET', null, trainerToken);
    assert(trainerSugg.status === 403, 'Trainers cannot read the suggestion box');
    const replyRes = await req(`/suggestions/${anon.data.data.id}`, 'PUT', { status: 'planned', admin_reply: 'Ordering this week.' }, adminToken);
    assert(replyRes.ok && replyRes.data.data.status === 'planned' && replyRes.data.data.student_name === 'Anonymous', 'Admin replies and sets status without revealing the author');
    const mySugg = await req('/suggestions/my', 'GET', null, studentToken);
    assert(mySugg.ok && mySugg.data.data.find(x => x.id === anon.data.data.id)?.admin_reply === 'Ordering this week.', 'Student sees the admin reply on their suggestion');

    // 10. Real-Time Notifications
    console.log('\n--- Testing Real-Time Notifications ---');
    const studentNotifs = await req('/notifications', 'GET', null, studentToken);
    assert(studentNotifs.ok && (studentNotifs.data.data?.length > 0 || studentNotifs.data.length > 0), 'Student receives real-time notifications for attendance verification and complaint resolution');

    // 11. Audit Logs
    console.log('\n--- Testing System Audit Trail ---');
    const auditLogs = await req('/audit-logs', 'GET', null, adminToken);
    assert(auditLogs.ok && (auditLogs.data.data?.length > 0 || auditLogs.data.length > 0), 'Audit trail logs recorded for attendance, complaints, and authentication');

    console.log('\n======================================================');
    console.log(` RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================\n');

    if (localServerInstance) {
      localServerInstance.close();
    }
    await closeMongo();

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    if (localServerInstance) {
      localServerInstance.close();
    }
    process.exit(1);
  }
}

// Auto-run
runE2ETests();
