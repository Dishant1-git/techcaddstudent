import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/batches - List batches
router.get('/', requireAuth, (req, res) => {
  try {
    const batches = db.find('batches');
    const enriched = batches.map(b => {
      const course = b.course_id ? db.findById('courses', b.course_id) : null;
      const trainer = b.trainer_id ? db.findById('trainers', b.trainer_id) : null;
      const trainerUser = trainer ? db.findById('users', trainer.user_id) : null;
      const students = db.find('students', s => String(s.batch_id) === String(b.id));

      return {
        ...b,
        course_name: course ? course.course_name : 'General Course',
        trainer_name: trainerUser ? trainerUser.name : 'Unassigned',
        trainer_code: trainer ? trainer.trainer_id : 'N/A',
        student_count: students.length
      };
    });

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Fetch batches error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve batches.' });
  }
});

// GET /api/batches/:id
router.get('/:id', requireAuth, (req, res) => {
  try {
    const batch = db.findById('batches', req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const course = batch.course_id ? db.findById('courses', batch.course_id) : null;
    const trainer = batch.trainer_id ? db.findById('trainers', batch.trainer_id) : null;
    const trainerUser = trainer ? db.findById('users', trainer.user_id) : null;
    const students = db.find('students', s => String(s.batch_id) === String(batch.id)).map(s => db.getEnrichedStudent(s));

    return res.json({
      success: true,
      data: {
        ...batch,
        course_name: course ? course.course_name : 'General Course',
        trainer_name: trainerUser ? trainerUser.name : 'Unassigned',
        students
      }
    });
  } catch (err) {
    console.error('Fetch batch detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve batch details.' });
  }
});

// POST /api/batches - Admin create batch
router.post('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const { batch_name, course_id, trainer_id, schedule_time, start_date, end_date, max_students, status } = req.body;
    if (!batch_name || !course_id) {
      return res.status(400).json({ success: false, message: 'Batch name and course selection are required.' });
    }

    const batch = db.insert('batches', {
      batch_name: batch_name.trim(),
      course_id: Number(course_id),
      trainer_id: trainer_id ? Number(trainer_id) : null,
      schedule_time: schedule_time ? schedule_time.trim() : '09:00 AM - 12:00 PM',
      start_date: start_date || new Date().toISOString().split('T')[0],
      end_date: end_date || '',
      max_students: max_students ? Number(max_students) : 30,
      status: status || 'active'
    });

    logAudit(req, 'BATCH_CREATED', `Created batch: ${batch.batch_name} (Course ID: ${batch.course_id})`);

    return res.status(201).json({ success: true, message: 'Batch created successfully', data: batch });
  } catch (err) {
    console.error('Create batch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create batch.' });
  }
});

// PUT /api/batches/:id - Admin update batch
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const batch = db.findById('batches', req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    const { batch_name, course_id, trainer_id, schedule_time, start_date, end_date, max_students, status } = req.body;
    const updates = {};
    if (batch_name) updates.batch_name = batch_name.trim();
    if (course_id) updates.course_id = Number(course_id);
    if (trainer_id !== undefined) updates.trainer_id = trainer_id ? Number(trainer_id) : null;
    if (schedule_time !== undefined) updates.schedule_time = schedule_time.trim();
    if (start_date) updates.start_date = start_date;
    if (end_date !== undefined) updates.end_date = end_date;
    if (max_students) updates.max_students = Number(max_students);
    if (status) updates.status = status;

    const updatedBatch = db.update('batches', batch.id, updates);
    logAudit(req, 'BATCH_UPDATED', `Updated batch: ${batch.batch_name}`);

    return res.json({ success: true, message: 'Batch updated successfully', data: updatedBatch });
  } catch (err) {
    console.error('Update batch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update batch.' });
  }
});

// DELETE /api/batches/:id - Admin delete batch
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const batch = db.findById('batches', req.params.id);
    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found.' });
    }

    db.delete('batches', batch.id);
    logAudit(req, 'BATCH_DELETED', `Deleted batch: ${batch.batch_name}`);

    return res.json({ success: true, message: 'Batch deleted successfully.' });
  } catch (err) {
    console.error('Delete batch error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete batch.' });
  }
});

export default router;
