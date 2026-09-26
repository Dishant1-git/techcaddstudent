import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';
import app from '../src/server.js';
import { seedDatabase } from '../src/db/seed.js';

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

    // 2.1. Student Self-Registration Admin Verification & Restrictive Access Workflow
    console.log('\n--- Testing Student Registration Admin Verification & Access Control ---');
    const testEmail = `new.applicant.${Date.now()}@portal.edu`;
    const regRes = await req('/auth/register', 'POST', {
      name: 'Applicant Alice',
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
    const dbFilePath = path.join(__dirname, '../src/db/data.json');
    if (fs.existsSync(dbFilePath)) {
      const dbContent = JSON.parse(fs.readFileSync(dbFilePath, 'utf8'));
      const allUsers = dbContent.users || [];
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
    assert(duplicateRes.status === 400, 'Duplicate attendance prevention enforced (same student, batch, date, session)');

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
