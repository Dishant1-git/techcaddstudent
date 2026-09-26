import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_FILE = path.join(__dirname, 'data.json');

// Initial Schema
const defaultSchema = {
  users: [],
  students: [],
  trainers: [],
  courses: [],
  batches: [],
  attendance: [],
  complaints: [],
  notifications: [],
  audit_logs: [],
  settings: {}
};

class Database {
  constructor() {
    this.data = { ...defaultSchema };
    this.isLoaded = false;
    this.savePromise = null;
    this.init();
  }

  init() {
    try {
      if (!fs.existsSync(__dirname)) {
        fs.mkdirSync(__dirname, { recursive: true });
      }
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = { ...defaultSchema, ...JSON.parse(raw) };
      } else {
        this.saveSync();
      }
      this.isLoaded = true;
    } catch (err) {
      console.error('Error initializing database:', err);
      this.data = { ...defaultSchema };
      this.isLoaded = true;
    }
  }

  saveSync() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database synchronously:', err);
    }
  }

  save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error saving database:', err);
    }
  }

  // Generic CRUD helpers
  find(collection, filterFn = () => true) {
    if (!this.data[collection]) return [];
    return this.data[collection].filter(filterFn);
  }

  findOne(collection, filterFn) {
    if (!this.data[collection]) return null;
    return this.data[collection].find(filterFn) || null;
  }

  findById(collection, id) {
    if (!this.data[collection]) return null;
    return this.data[collection].find(item => String(item.id) === String(id)) || null;
  }

  normalizeEmail(email) {
    return typeof email === 'string' ? email.trim().toLowerCase() : '';
  }

  findUserByEmail(email) {
    const normalizedEmail = this.normalizeEmail(email);
    if (!normalizedEmail) return null;
    return this.findOne('users', user => this.normalizeEmail(user.email) === normalizedEmail);
  }

  ensureUniqueUserEmail(email, excludedUserId = null) {
    const normalizedEmail = this.normalizeEmail(email);
    const existingUser = this.findUserByEmail(normalizedEmail);
    const isSameUser = existingUser && String(existingUser.id) === String(excludedUserId);

    if (existingUser && !isSameUser) {
      const error = new Error('An account with this email address already exists.');
      error.code = 'DUPLICATE_EMAIL';
      throw error;
    }

    return normalizedEmail;
  }

  insert(collection, item) {
    if (!this.data[collection]) this.data[collection] = [];
    const normalizedItem = { ...item };
    if (collection === 'users') {
      normalizedItem.email = this.ensureUniqueUserEmail(item.email);
    }

    const now = new Date().toISOString();
    const newItem = {
      id: normalizedItem.id || this.generateId(collection),
      ...normalizedItem,
      created_at: normalizedItem.created_at || now,
      updated_at: normalizedItem.updated_at || now,
    };
    this.data[collection].push(newItem);
    this.save();
    return newItem;
  }

  update(collection, id, updates) {
    if (!this.data[collection]) return null;
    const index = this.data[collection].findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;

    const existing = this.data[collection][index];
    const normalizedUpdates = { ...updates };
    if (collection === 'users' && Object.prototype.hasOwnProperty.call(normalizedUpdates, 'email')) {
      normalizedUpdates.email = this.ensureUniqueUserEmail(normalizedUpdates.email, existing.id);
    }
    const updated = {
      ...existing,
      ...normalizedUpdates,
      id: existing.id, // ID must remain immutable
      created_at: existing.created_at,
      updated_at: new Date().toISOString()
    };
    this.data[collection][index] = updated;
    this.save();
    return updated;
  }

  delete(collection, id) {
    if (!this.data[collection]) return false;
    const initialLen = this.data[collection].length;
    this.data[collection] = this.data[collection].filter(item => String(item.id) !== String(id));
    if (this.data[collection].length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  count(collection, filterFn = () => true) {
    if (!this.data[collection]) return 0;
    return this.data[collection].filter(filterFn).length;
  }

  generateId(collection) {
    const list = this.data[collection] || [];
    if (list.length === 0) return 1;
    const maxId = list.reduce((max, item) => {
      const num = parseInt(item.id, 10);
      return !isNaN(num) && num > max ? num : max;
    }, 0);
    return maxId + 1;
  }

  // Relational Hydration Helpers
  getEnrichedAttendance(attendanceRecord) {
    if (!attendanceRecord) return null;
    const student = this.findById('students', attendanceRecord.student_id);
    const user = student ? this.findById('users', student.user_id) : null;
    const trainer = attendanceRecord.trainer_id ? this.findById('trainers', attendanceRecord.trainer_id) : null;
    const trainerUser = trainer ? this.findById('users', trainer.user_id) : null;
    const batch = attendanceRecord.batch_id ? this.findById('batches', attendanceRecord.batch_id) : null;
    const course = batch ? this.findById('courses', batch.course_id) : (attendanceRecord.course_id ? this.findById('courses', attendanceRecord.course_id) : null);

    return {
      ...attendanceRecord,
      student_name: user ? user.name : 'Unknown Student',
      student_email: user ? user.email : '',
      student_code: student ? student.student_id : 'N/A',
      course_id: course ? course.id : null,
      course_name: course ? course.course_name : 'General Program',
      batch_id: batch ? batch.id : attendanceRecord.batch_id,
      batch_name: batch ? batch.batch_name : 'General Batch',
      trainer_name: trainerUser ? trainerUser.name : (attendanceRecord.verified_by_name || 'Unassigned'),
      trainer_code: trainer ? trainer.trainer_id : 'N/A'
    };
  }

  getEnrichedStudent(student) {
    if (!student) return null;
    const user = this.findById('users', student.user_id);
    const course = student.course_id ? this.findById('courses', student.course_id) : null;
    const batch = student.batch_id ? this.findById('batches', student.batch_id) : null;
    const trainer = student.trainer_id ? this.findById('trainers', student.trainer_id) : null;
    const trainerUser = trainer ? this.findById('users', trainer.user_id) : null;

    // Calculate attendance statistics
    const attendanceRecords = this.find('attendance', a => String(a.student_id) === String(student.id));
    const totalAttendance = attendanceRecords.length;
    const verifiedAttendance = attendanceRecords.filter(a => a.status === 'Verified').length;
    const pendingAttendance = attendanceRecords.filter(a => a.status === 'Pending Verification').length;
    const rejectedAttendance = attendanceRecords.filter(a => a.status === 'Rejected').length;
    const attendancePercentage = totalAttendance > 0 ? Math.round((verifiedAttendance / totalAttendance) * 100) : 100;

    return {
      ...student,
      name: user ? user.name : 'Unknown',
      email: user ? user.email : '',
      status: user ? user.status : 'active',
      phone: student.phone || (user ? user.phone : ''),
      avatar: user ? user.avatar : null,
      domain: student.domain || (course ? course.course_name : '') || '',
      course_name: course ? course.course_name : 'Not Enrolled',
      batch_name: batch ? batch.batch_name : 'Not Assigned',
      trainer_name: trainerUser ? trainerUser.name : 'Not Assigned',
      trainer_email: trainerUser ? trainerUser.email : '',
      stats: {
        totalClasses: totalAttendance,
        attended: verifiedAttendance,
        pending: pendingAttendance,
        missed: rejectedAttendance,
        attendancePercentage
      }
    };
  }

  getEnrichedTrainer(trainer) {
    if (!trainer) return null;
    const user = this.findById('users', trainer.user_id);
    const batches = this.find('batches', b => String(b.trainer_id) === String(trainer.id));
    const batchIds = batches.map(b => String(b.id));
    const students = this.find('students', s => String(s.trainer_id) === String(trainer.id) || (s.batch_id && batchIds.includes(String(s.batch_id))));
    
    // Assigned courses
    const courseIds = [...new Set(batches.map(b => b.course_id).filter(Boolean))];
    const courses = courseIds.map(cId => this.findById('courses', cId)).filter(Boolean);

    // Pending verifications count
    const studentIds = students.map(s => String(s.id));
    const pendingVerifications = this.count('attendance', a => 
      (String(a.trainer_id) === String(trainer.id) || studentIds.includes(String(a.student_id))) && 
      a.status === 'Pending Verification'
    );

    return {
      ...trainer,
      name: user ? user.name : 'Unknown Trainer',
      email: user ? user.email : '',
      phone: trainer.phone || (user ? user.phone : ''),
      status: user ? user.status : 'active',
      avatar: user ? user.avatar : null,
      assigned_batches: batches,
      assigned_courses: courses,
      assigned_students_count: students.length,
      pending_verifications_count: pendingVerifications
    };
  }

  getEnrichedComplaint(complaint) {
    if (!complaint) return null;
    const student = this.findById('students', complaint.student_id);
    const user = student ? this.findById('users', student.user_id) : null;
    const batch = student && student.batch_id ? this.findById('batches', student.batch_id) : null;

    return {
      ...complaint,
      student_name: user ? user.name : 'Unknown Student',
      student_code: student ? student.student_id : 'N/A',
      student_email: user ? user.email : '',
      batch_name: batch ? batch.batch_name : 'N/A'
    };
  }
}

export const db = new Database();
