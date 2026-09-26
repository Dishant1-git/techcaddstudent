import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectMongo } from './mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Legacy JSON store, only read once to migrate existing data into an empty MongoDB
const LEGACY_DB_FILE = path.join(__dirname, 'data.json');

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
};

const COLLECTIONS = Object.keys(defaultSchema);

// In-memory cache backed by MongoDB. Reads are served from memory so the
// synchronous API used by the routes stays the same; every write is persisted
// to MongoDB in order through a promise queue.
class Database {
  constructor() {
    this.data = structuredClone(defaultSchema);
    this.mongo = null;
    this.isLoaded = false;
    this.writeQueue = Promise.resolve();
    this.changeStream = null;
    // Mongo _id -> app id, needed because change stream delete events only carry _id
    this.mongoIds = new Map();
  }

  async connect() {
    if (this.isLoaded) return;
    this.mongo = await connectMongo();

    for (const name of COLLECTIONS) {
      const docs = await this.mongo.collection(name).find({}).toArray();
      this.data[name] = docs.map(({ _id, ...item }) => {
        this.mongoIds.set(String(_id), item.id);
        return item;
      });
    }

    const isEmpty = COLLECTIONS.every(name => this.data[name].length === 0);
    if (isEmpty && fs.existsSync(LEGACY_DB_FILE)) {
      await this.importLegacyData();
    }

    for (const name of COLLECTIONS) {
      await this.mongo.collection(name).createIndex({ id: 1 }, { unique: true });
    }
    this.isLoaded = true;
  }

  async importLegacyData() {
    const legacy = JSON.parse(fs.readFileSync(LEGACY_DB_FILE, 'utf-8'));
    for (const name of COLLECTIONS) {
      const docs = Array.isArray(legacy[name]) ? legacy[name] : [];
      if (docs.length === 0) continue;
      await this.mongo.collection(name).insertMany(docs.map(doc => ({ ...doc })));
      this.data[name] = docs;
    }
    console.log('[MongoDB] Imported existing data from data.json');
  }

  persist(operation) {
    this.writeQueue = this.writeQueue
      .then(() => operation(this.mongo))
      .catch(err => console.error('[MongoDB] Write failed:', err));
    return this.writeQueue;
  }

  // Resolves once every queued write has reached MongoDB
  flush() {
    return this.writeQueue;
  }

  // Keeps the cache in sync with writes made outside this process (scripts,
  // a local dev server on the same database, the Atlas UI). Without this the
  // cache goes stale and generateId() can hand out ids that already exist.
  watchChanges() {
    if (this.changeStream) return;
    this.changeStream = this.mongo.watch(
      [{ $match: { 'ns.coll': { $in: COLLECTIONS } } }],
      { fullDocument: 'updateLookup' }
    );
    this.changeStream.on('change', change => this.applyChange(change));
    this.changeStream.on('error', err => {
      console.error('[MongoDB] Change stream error, reconnecting in 5s:', err.message);
      this.changeStream = null;
      setTimeout(() => this.watchChanges(), 5000).unref();
    });
  }

  applyChange(change) {
    const collection = change.ns.coll;
    const key = String(change.documentKey._id);

    if (change.operationType === 'delete') {
      const id = this.mongoIds.get(key);
      this.mongoIds.delete(key);
      if (id === undefined) return;
      this.data[collection] = this.data[collection].filter(item => String(item.id) !== String(id));
      return;
    }

    if (!change.fullDocument) return;
    const { _id, ...item } = change.fullDocument;
    this.mongoIds.set(key, item.id);

    const list = this.data[collection];
    const index = list.findIndex(existing => String(existing.id) === String(item.id));
    if (index === -1) {
      list.push(item);
    } else if (!(list[index].updated_at > item.updated_at)) {
      // Skip echoes of this process's own older writes that arrive after a newer in-memory change
      list[index] = item;
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
    this.persist(mongo => mongo.collection(collection).insertOne({ ...newItem }));
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
    this.persist(mongo => mongo.collection(collection).replaceOne({ id: existing.id }, { ...updated }));
    return updated;
  }

  delete(collection, id) {
    if (!this.data[collection]) return false;
    const removedIds = this.data[collection]
      .filter(item => String(item.id) === String(id))
      .map(item => item.id);
    if (removedIds.length > 0) {
      this.data[collection] = this.data[collection].filter(item => String(item.id) !== String(id));
      this.persist(mongo => mongo.collection(collection).deleteMany({ id: { $in: removedIds } }));
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
