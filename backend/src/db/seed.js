import bcrypt from 'bcryptjs';
import { db } from './database.js';

export async function seedDatabase() {
  console.log('--- Initializing / Seeding Database ---');

  // Check if users already exist
  const existingUsers = db.find('users');
  if (existingUsers.length > 0) {
    console.log('Database already populated with', existingUsers.length, 'users. Skipping full reset.');
    return;
  }

  // Clear existing collections
  db.data.users = [];
  db.data.students = [];
  db.data.trainers = [];
  db.data.courses = [];
  db.data.batches = [];
  db.data.attendance = [];
  db.data.complaints = [];
  db.data.notifications = [];
  db.data.audit_logs = [];

  const passwordHash = await bcrypt.hash('password123', 10);
  const adminPassword = await bcrypt.hash('Harinder@9203', 10);
  const trainerPassword = await bcrypt.hash('trainer123', 10);
  const studentPassword = await bcrypt.hash('student123', 10);

  // 1. Users
  const uAdmin = db.insert('users', {
    name: 'Harinder Singh',
    email: 'singhharinder.techcadd@gmail.com',
    password_hash: adminPassword,
    role: 'admin',
    status: 'active',
    phone: '+91 83604-29812',
    avatar: '/favicon.png'
  });

  const uTrainer1 = db.insert('users', {
    name: 'Alex Rivera',
    email: 'trainer.alex@portal.edu',
    password_hash: trainerPassword,
    role: 'trainer',
    status: 'active',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  });

  const uTrainer2 = db.insert('users', {
    name: 'Sarah Jenkins',
    email: 'trainer.sarah@portal.edu',
    password_hash: trainerPassword,
    role: 'trainer',
    status: 'active',
    phone: '+1 (555) 345-6789',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  });

  const uTrainer3 = db.insert('users', {
    name: 'Marcus Chen',
    email: 'trainer.marcus@portal.edu',
    password_hash: trainerPassword,
    role: 'trainer',
    status: 'active',
    phone: '+1 (555) 456-7890',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80'
  });

  const uStudent1 = db.insert('users', {
    name: 'John Doe',
    email: 'student.john@portal.edu',
    password_hash: studentPassword,
    role: 'student',
    status: 'active',
    phone: '+1 (555) 567-8901',
    avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80'
  });

  const uStudent2 = db.insert('users', {
    name: 'Emily Watson',
    email: 'student.emily@portal.edu',
    password_hash: studentPassword,
    role: 'student',
    status: 'active',
    phone: '+1 (555) 678-9012',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80'
  });

  const uStudent3 = db.insert('users', {
    name: 'Michael Chang',
    email: 'student.michael@portal.edu',
    password_hash: studentPassword,
    role: 'student',
    status: 'active',
    phone: '+1 (555) 789-0123',
    avatar: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80'
  });

  const uStudent4 = db.insert('users', {
    name: 'Sophia Martinez',
    email: 'student.sophia@portal.edu',
    password_hash: studentPassword,
    role: 'student',
    status: 'active',
    phone: '+1 (555) 890-1234',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80'
  });

  const uStudent5 = db.insert('users', {
    name: 'David Kim',
    email: 'student.david@portal.edu',
    password_hash: studentPassword,
    role: 'student',
    status: 'active',
    phone: '+1 (555) 901-2345',
    avatar: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80'
  });

  const uStudent6 = db.insert('users', {
    name: 'Olivia Taylor',
    email: 'student.olivia@portal.edu',
    password_hash: studentPassword,
    role: 'student',
    status: 'active',
    phone: '+1 (555) 012-3456',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80'
  });

  // 2. Courses
  const c1 = db.insert('courses', {
    course_name: 'Full-Stack Web Development',
    code: 'FSWD-101',
    duration: '6 Months',
    description: 'Comprehensive modern JavaScript, React, Node.js, Express, SQL, and Cloud Deployment.',
    status: 'active'
  });

  const c2 = db.insert('courses', {
    course_name: 'Data Science & Machine Learning',
    code: 'DSAI-201',
    duration: '6 Months',
    description: 'Python, NumPy, Pandas, Scikit-Learn, Deep Learning, and Neural Networks.',
    status: 'active'
  });

  const c3 = db.insert('courses', {
    course_name: 'Cybersecurity & Cloud Infrastructure',
    code: 'CYBER-301',
    duration: '4 Months',
    description: 'Network Defense, Ethical Hacking, AWS/Azure Cloud Security, and Incident Response.',
    status: 'active'
  });

  const c4 = db.insert('courses', {
    course_name: 'UI/UX Product Design & Figma',
    code: 'UIUX-401',
    duration: '3 Months',
    description: 'User Research, Wireframing, High-Fidelity Prototyping, and Design Systems.',
    status: 'active'
  });

  // 3. Trainers
  const t1 = db.insert('trainers', {
    user_id: uTrainer1.id,
    trainer_id: 'TRN-101',
    specialization: 'Full-Stack JavaScript & Architecture',
    phone: uTrainer1.phone,
    bio: 'Over 8 years experience leading engineering teams and teaching modern web frameworks.'
  });

  const t2 = db.insert('trainers', {
    user_id: uTrainer2.id,
    trainer_id: 'TRN-102',
    specialization: 'Applied AI & Statistical Modeling',
    phone: uTrainer2.phone,
    bio: 'Former data scientist with deep experience in predictive analytics and LLMs.'
  });

  const t3 = db.insert('trainers', {
    user_id: uTrainer3.id,
    trainer_id: 'TRN-103',
    specialization: 'Cloud Security & DevOps',
    phone: uTrainer3.phone,
    bio: 'Certified CISSP and AWS Solutions Architect with real-world threat hunting background.'
  });

  // 4. Batches
  const b1 = db.insert('batches', {
    batch_name: 'Batch FSWD-2026-A',
    course_id: c1.id,
    trainer_id: t1.id,
    schedule_time: '09:00 AM - 12:00 PM (Mon-Fri)',
    start_date: '2026-01-15',
    end_date: '2026-07-15',
    status: 'active',
    max_students: 30
  });

  const b2 = db.insert('batches', {
    batch_name: 'Batch DSAI-2026-B',
    course_id: c2.id,
    trainer_id: t2.id,
    schedule_time: '01:30 PM - 04:30 PM (Mon-Fri)',
    start_date: '2026-02-01',
    end_date: '2026-08-01',
    status: 'active',
    max_students: 25
  });

  const b3 = db.insert('batches', {
    batch_name: 'Batch CYBER-2026-C',
    course_id: c3.id,
    trainer_id: t3.id,
    schedule_time: '05:30 PM - 08:30 PM (Mon-Thu)',
    start_date: '2026-03-01',
    end_date: '2026-07-01',
    status: 'active',
    max_students: 20
  });

  const b4 = db.insert('batches', {
    batch_name: 'Batch UIUX-2026-D',
    course_id: c4.id,
    trainer_id: t1.id,
    schedule_time: '10:00 AM - 02:00 PM (Sat-Sun)',
    start_date: '2026-02-15',
    end_date: '2026-05-15',
    status: 'active',
    max_students: 20
  });

  // 5. Students
  const s1 = db.insert('students', {
    user_id: uStudent1.id,
    student_id: 'STU-2026-001',
    course_id: c1.id,
    batch_id: b1.id,
    trainer_id: t1.id,
    phone: uStudent1.phone,
    address: '742 Evergreen Terrace, Suite 101',
    emergency_contact: 'Mary Doe (+1 555-987-6543)'
  });

  const s2 = db.insert('students', {
    user_id: uStudent2.id,
    student_id: 'STU-2026-002',
    course_id: c1.id,
    batch_id: b1.id,
    trainer_id: t1.id,
    phone: uStudent2.phone,
    address: '124 Conch Street, Apt 4B',
    emergency_contact: 'James Watson (+1 555-876-5432)'
  });

  const s3 = db.insert('students', {
    user_id: uStudent3.id,
    student_id: 'STU-2026-003',
    course_id: c2.id,
    batch_id: b2.id,
    trainer_id: t2.id,
    phone: uStudent3.phone,
    address: '42 Wallaby Way, Sydney Bldg 3',
    emergency_contact: 'Lily Chang (+1 555-765-4321)'
  });

  const s4 = db.insert('students', {
    user_id: uStudent4.id,
    student_id: 'STU-2026-004',
    course_id: c2.id,
    batch_id: b2.id,
    trainer_id: t2.id,
    phone: uStudent4.phone,
    address: '350 Fifth Avenue, 21st Floor',
    emergency_contact: 'Carlos Martinez (+1 555-654-3210)'
  });

  const s5 = db.insert('students', {
    user_id: uStudent5.id,
    student_id: 'STU-2026-005',
    course_id: c3.id,
    batch_id: b3.id,
    trainer_id: t3.id,
    phone: uStudent5.phone,
    address: '221B Baker Street',
    emergency_contact: 'Min-Jun Kim (+1 555-543-2109)'
  });

  const s6 = db.insert('students', {
    user_id: uStudent6.id,
    student_id: 'STU-2026-006',
    course_id: c1.id,
    batch_id: b1.id,
    trainer_id: t1.id,
    phone: uStudent6.phone,
    address: '10 Downing Court',
    emergency_contact: 'George Taylor (+1 555-432-1098)'
  });

  // 6. Attendance Generation (Realistic dates over last 14 days + today)
  const today = new Date();
  const formatDate = (d) => d.toISOString().split('T')[0];

  const sessions = ['Morning Lecture', 'Afternoon Lab'];
  const studentsList = [
    { student: s1, trainer: t1, batch: b1 },
    { student: s2, trainer: t1, batch: b1 },
    { student: s3, trainer: t2, batch: b2 },
    { student: s4, trainer: t2, batch: b2 },
    { student: s5, trainer: t3, batch: b3 },
    { student: s6, trainer: t1, batch: b1 }
  ];

  for (let i = 12; i >= 1; i--) {
    const d = new Date();
    d.setDate(today.getDate() - i);
    // Skip weekends
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = formatDate(d);

    for (const item of studentsList) {
      // 85% verified, 10% rejected, 5% skipped
      const rand = Math.random();
      if (rand < 0.85) {
        db.insert('attendance', {
          student_id: item.student.id,
          trainer_id: item.trainer.id,
          batch_id: item.batch.id,
          course_id: item.batch.course_id,
          date: dateStr,
          session: 'Morning Lecture',
          check_in_time: '09:04 AM',
          status: 'Verified',
          verification_time: `${dateStr}T10:15:00.000Z`,
          verified_by: item.trainer.id,
          verified_by_name: item.trainer.id === t1.id ? 'Alex Rivera' : (item.trainer.id === t2.id ? 'Sarah Jenkins' : 'Marcus Chen'),
          rejection_reason: null,
          created_at: `${dateStr}T09:04:00.000Z`
        });
      } else if (rand < 0.95) {
        db.insert('attendance', {
          student_id: item.student.id,
          trainer_id: item.trainer.id,
          batch_id: item.batch.id,
          course_id: item.batch.course_id,
          date: dateStr,
          session: 'Morning Lecture',
          check_in_time: '10:45 AM',
          status: 'Rejected',
          verification_time: `${dateStr}T11:30:00.000Z`,
          verified_by: item.trainer.id,
          verified_by_name: item.trainer.id === t1.id ? 'Alex Rivera' : (item.trainer.id === t2.id ? 'Sarah Jenkins' : 'Marcus Chen'),
          rejection_reason: 'Checked in more than 90 minutes late without authorized leave note.',
          created_at: `${dateStr}T10:45:00.000Z`
        });
      }
    }
  }

  // Today's attendance - some Pending Verification for immediate testing by Trainers!
  const todayStr = formatDate(today);
  // John Doe (s1) checked in today -> Pending Verification for Alex Rivera
  db.insert('attendance', {
    student_id: s1.id,
    trainer_id: t1.id,
    batch_id: b1.id,
    course_id: c1.id,
    date: todayStr,
    session: 'Morning Lecture',
    check_in_time: '09:02 AM',
    status: 'Pending Verification',
    verification_time: null,
    verified_by: null,
    rejection_reason: null,
    created_at: new Date().toISOString()
  });

  // Emily Watson (s2) checked in today -> Pending Verification for Alex Rivera
  db.insert('attendance', {
    student_id: s2.id,
    trainer_id: t1.id,
    batch_id: b1.id,
    course_id: c1.id,
    date: todayStr,
    session: 'Morning Lecture',
    check_in_time: '09:05 AM',
    status: 'Pending Verification',
    verification_time: null,
    verified_by: null,
    rejection_reason: null,
    created_at: new Date().toISOString()
  });

  // Michael Chang (s3) checked in today -> Pending Verification for Sarah Jenkins
  db.insert('attendance', {
    student_id: s3.id,
    trainer_id: t2.id,
    batch_id: b2.id,
    course_id: c2.id,
    date: todayStr,
    session: 'Afternoon Lab',
    check_in_time: '01:28 PM',
    status: 'Pending Verification',
    verification_time: null,
    verified_by: null,
    rejection_reason: null,
    created_at: new Date().toISOString()
  });

  // 7. Complaints (Strictly Admin Access)
  db.insert('complaints', {
    student_id: s1.id,
    category: 'Infrastructure',
    subject: 'Projector flickering intermittently in Lab 302',
    description: 'During React component lifecycle diagrams, the HDMI output keeps blacking out every 5 minutes.',
    attachment: null,
    priority: 'Medium',
    status: 'Resolved',
    admin_response: 'Our IT facilities team replaced the HDMI transceiver cable and video card in Lab 302 yesterday. All checked and working.',
    admin_notes: 'Technician ticket #IT-4902 closed on Wednesday.',
    created_at: '2026-08-20T10:30:00.000Z',
    updated_at: '2026-08-21T14:20:00.000Z'
  });

  db.insert('complaints', {
    student_id: s2.id,
    category: 'Course',
    subject: 'Request for additional practice exercises on Redux Toolkit',
    description: 'We would appreciate additional sample repositories and mock code challenges for Redux Async Thunk patterns.',
    attachment: null,
    priority: 'Low',
    status: 'Under Review',
    admin_response: 'The academic curriculum team has scheduled an updated supplementary repository release this coming Friday.',
    admin_notes: 'Forwarded to curriculum coordinator.',
    created_at: '2026-08-23T11:15:00.000Z',
    updated_at: '2026-08-24T09:00:00.000Z'
  });

  db.insert('complaints', {
    student_id: s3.id,
    category: 'Technical Issue',
    subject: 'Cannot access institute GPU cluster for deep learning lab',
    description: 'My SSH credentials return permission denied when connecting to gpu01.training.internal.',
    attachment: null,
    priority: 'High',
    status: 'Open',
    admin_response: null,
    admin_notes: 'Check LDAP sync for DSAI-2026-B batch permissions.',
    created_at: '2026-08-26T16:45:00.000Z',
    updated_at: '2026-08-26T16:45:00.000Z'
  });

  db.insert('complaints', {
    student_id: s5.id,
    category: 'Attendance',
    subject: 'Attendance recorded as absent during cyber defense lab switch',
    description: 'I was present in room 401 for the packet capture session but my check-in was marked rejected.',
    attachment: null,
    priority: 'Medium',
    status: 'Open',
    admin_response: null,
    admin_notes: 'Verify with Marcus Chen regarding student location.',
    created_at: '2026-08-27T08:15:00.000Z',
    updated_at: '2026-08-27T08:15:00.000Z'
  });

  // 8. Notifications
  db.insert('notifications', {
    user_id: uStudent1.id,
    title: 'Attendance Verified',
    message: 'Your attendance for Full-Stack Web Development on 2026-08-26 has been verified by Alex Rivera.',
    type: 'attendance_verified',
    is_read: true,
    link: '/student/attendance'
  });

  db.insert('notifications', {
    user_id: uStudent1.id,
    title: 'Complaint Resolved',
    message: 'Admin has responded to your complaint regarding "Projector flickering in Lab 302".',
    type: 'complaint_update',
    is_read: false,
    link: '/student/complaints'
  });

  db.insert('notifications', {
    user_id: uTrainer1.id,
    title: 'Pending Attendance Verifications',
    message: '2 students have marked attendance for Batch FSWD-2026-A requiring your verification.',
    type: 'attendance_pending',
    is_read: false,
    link: '/trainer/verifications'
  });

  db.insert('notifications', {
    user_id: uAdmin.id,
    title: 'New Complaint Submitted',
    message: 'High priority complaint submitted by Michael Chang regarding GPU cluster access.',
    type: 'complaint_new',
    is_read: false,
    link: '/admin/complaints'
  });

  // 9. Audit Logs
  db.insert('audit_logs', {
    user_id: uAdmin.id,
    user_name: 'Harinder Singh',
    user_role: 'admin',
    action: 'SYSTEM_INITIALIZED',
    details: 'Institute portal initialized with base courses, trainers, and batches.',
    ip_address: '127.0.0.1'
  });

  db.insert('audit_logs', {
    user_id: uStudent1.id,
    user_name: 'John Doe',
    user_role: 'student',
    action: 'ATTENDANCE_MARKED',
    details: `Marked attendance for Batch FSWD-2026-A (Morning Lecture) on ${todayStr}. Status: Pending Verification.`,
    ip_address: '192.168.1.45'
  });

  db.insert('audit_logs', {
    user_id: uStudent2.id,
    user_name: 'Emily Watson',
    user_role: 'student',
    action: 'ATTENDANCE_MARKED',
    details: `Marked attendance for Batch FSWD-2026-A (Morning Lecture) on ${todayStr}. Status: Pending Verification.`,
    ip_address: '192.168.1.48'
  });

  db.saveSync();
  console.log('--- Database Seed Completed Successfully ---');
}

// Auto-run if executed directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
}
