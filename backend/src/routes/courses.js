import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// GET /api/courses - Public/Authenticated list
router.get('/', requireAuth, (req, res) => {
  try {
    const courses = db.find('courses');
    const enriched = courses.map(c => {
      const batches = db.find('batches', b => String(b.course_id) === String(c.id));
      const students = db.find('students', s => String(s.course_id) === String(c.id));
      return {
        ...c,
        batch_count: batches.length,
        student_count: students.length
      };
    });
    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Fetch courses error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve courses.' });
  }
});

// GET /api/courses/:id
router.get('/:id', requireAuth, (req, res) => {
  try {
    const course = db.findById('courses', req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }
    const batches = db.find('batches', b => String(b.course_id) === String(course.id));
    const students = db.find('students', s => String(s.course_id) === String(course.id)).map(s => db.getEnrichedStudent(s));

    return res.json({
      success: true,
      data: {
        ...course,
        batches,
        students
      }
    });
  } catch (err) {
    console.error('Fetch course detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch course details.' });
  }
});

// POST /api/courses - Admin create
router.post('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const { course_name, code, duration, description, status } = req.body;
    if (!course_name || !duration) {
      return res.status(400).json({ success: false, message: 'Course name and duration are required.' });
    }

    const nextCode = code || `CRS-${db.find('courses').length + 101}`;
    const course = db.insert('courses', {
      course_name: course_name.trim(),
      code: nextCode.trim(),
      duration: duration.trim(),
      description: description ? description.trim() : '',
      status: status || 'active'
    });

    logAudit(req, 'COURSE_CREATED', `Created course: ${course.course_name} (${course.code})`);

    return res.status(201).json({ success: true, message: 'Course created successfully', data: course });
  } catch (err) {
    console.error('Create course error:', err);
    return res.status(500).json({ success: false, message: 'Failed to create course.' });
  }
});

// PUT /api/courses/:id - Admin update
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const course = db.findById('courses', req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const { course_name, code, duration, description, status } = req.body;
    const updates = {};
    if (course_name) updates.course_name = course_name.trim();
    if (code) updates.code = code.trim();
    if (duration) updates.duration = duration.trim();
    if (description !== undefined) updates.description = description.trim();
    if (status) updates.status = status;

    const updatedCourse = db.update('courses', course.id, updates);
    logAudit(req, 'COURSE_UPDATED', `Updated course: ${course.course_name}`);

    return res.json({ success: true, message: 'Course updated successfully', data: updatedCourse });
  } catch (err) {
    console.error('Update course error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update course.' });
  }
});

// DELETE /api/courses/:id - Admin delete
router.delete('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const course = db.findById('courses', req.params.id);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    db.delete('courses', course.id);
    logAudit(req, 'COURSE_DELETED', `Deleted course: ${course.course_name}`);

    return res.json({ success: true, message: 'Course deleted successfully.' });
  } catch (err) {
    console.error('Delete course error:', err);
    return res.status(500).json({ success: false, message: 'Failed to delete course.' });
  }
});

export default router;
