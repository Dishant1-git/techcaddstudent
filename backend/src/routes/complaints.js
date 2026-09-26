import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireStudent, requireAdmin } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

// -------------------------------------------------------------
// TRAINER ACCESS BLOCKER
// -------------------------------------------------------------
router.use((req, res, next) => {
  if (req.user && req.user.role === 'trainer') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied. Trainers are strictly prohibited from viewing or managing student complaints.'
    });
  }
  next();
});

// -------------------------------------------------------------
// STUDENT COMPLAINT ENDPOINTS
// -------------------------------------------------------------

// POST /api/complaints - Student submits a complaint
router.post('/', requireAuth, requireStudent, (req, res) => {
  try {
    const student = db.findOne('students', s => String(s.user_id) === String(req.user.id));
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { category, subject, description, priority, attachment } = req.body;

    if (!category || !subject || !description) {
      return res.status(400).json({ success: false, message: 'Category, subject, and description are required.' });
    }

    const allowedCategories = ['Trainer', 'Attendance', 'Course', 'Infrastructure', 'Technical Issue', 'Other'];
    if (!allowedCategories.includes(category)) {
      return res.status(400).json({ success: false, message: `Category must be one of: ${allowedCategories.join(', ')}` });
    }

    const allowedPriorities = ['Low', 'Medium', 'High', 'Urgent'];
    const validPriority = allowedPriorities.includes(priority) ? priority : 'Medium';

    const newComplaint = db.insert('complaints', {
      student_id: student.id,
      category,
      subject: subject.trim(),
      description: description.trim(),
      attachment: attachment || null,
      priority: validPriority,
      status: 'Open',
      admin_response: null,
      admin_notes: null,
      resolved_at: null,
      resolved_by: null
    });

    // Notify Admins
    const admins = db.find('users', u => u.role === 'admin' && u.status === 'active');
    admins.forEach(admin => {
      db.insert('notifications', {
        user_id: admin.id,
        title: `New Complaint: ${validPriority} Priority`,
        message: `Student ${req.user.name} reported: "${subject.trim()}". Category: ${category}.`,
        type: 'complaint_new',
        is_read: false,
        link: '/admin/complaints'
      });
    });

    logAudit(req, 'COMPLAINT_CREATED', `Complaint #${newComplaint.id} submitted by ${req.user.name}: "${subject.trim()}" (${category})`);

    const enriched = db.getEnrichedComplaint(newComplaint);
    // Student view should never show internal admin notes
    delete enriched.admin_notes;

    return res.status(201).json({
      success: true,
      message: 'Your complaint has been submitted securely to the administration.',
      data: enriched
    });
  } catch (err) {
    console.error('Submit complaint error:', err);
    return res.status(500).json({ success: false, message: 'Failed to submit complaint.' });
  }
});

// GET /api/complaints/my - Student views ONLY their own complaints
router.get('/my', requireAuth, requireStudent, (req, res) => {
  try {
    const student = db.findOne('students', s => String(s.user_id) === String(req.user.id));
    if (!student) {
      return res.status(404).json({ success: false, message: 'Student profile not found.' });
    }

    const { status, category } = req.query;

    let complaints = db.find('complaints', c => String(c.student_id) === String(student.id));

    if (status) {
      complaints = complaints.filter(c => c.status === status);
    }
    if (category) {
      complaints = complaints.filter(c => c.category === category);
    }

    complaints.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const sanitized = complaints.map(c => {
      const enriched = db.getEnrichedComplaint(c);
      // Strip internal admin notes for privacy
      delete enriched.admin_notes;
      return enriched;
    });

    return res.json({ success: true, count: sanitized.length, data: sanitized });
  } catch (err) {
    console.error('Fetch student complaints error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve your complaints.' });
  }
});

// -------------------------------------------------------------
// ADMIN COMPLAINT MANAGEMENT (Strictly Admin Access)
// -------------------------------------------------------------

// GET /api/complaints/admin/all - Admin views all complaints
router.get('/admin/all', requireAuth, requireAdmin, (req, res) => {
  try {
    const { category, status, priority, search } = req.query;

    let complaints = db.find('complaints');

    if (category) {
      complaints = complaints.filter(c => c.category === category);
    }
    if (status) {
      complaints = complaints.filter(c => c.status === status);
    }
    if (priority) {
      complaints = complaints.filter(c => c.priority === priority);
    }

    let enriched = complaints.map(c => db.getEnrichedComplaint(c));

    if (search) {
      const q = search.toLowerCase();
      enriched = enriched.filter(c => 
        c.subject.toLowerCase().includes(q) ||
        c.description.toLowerCase().includes(q) ||
        c.student_name.toLowerCase().includes(q) ||
        (c.student_code && c.student_code.toLowerCase().includes(q)) ||
        (c.category && c.category.toLowerCase().includes(q))
      );
    }

    enriched.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (err) {
    console.error('Fetch all complaints error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve complaints.' });
  }
});

// GET /api/complaints/admin/:id - Admin views detailed complaint
router.get('/admin/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const complaint = db.findById('complaints', req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const enriched = db.getEnrichedComplaint(complaint);
    return res.json({ success: true, data: enriched });
  } catch (err) {
    console.error('Fetch complaint detail error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve complaint detail.' });
  }
});

// PUT /api/complaints/admin/:id/status - Admin updates status, response, internal notes
router.put('/admin/:id/status', requireAuth, requireAdmin, (req, res) => {
  try {
    const complaint = db.findById('complaints', req.params.id);
    if (!complaint) {
      return res.status(404).json({ success: false, message: 'Complaint not found.' });
    }

    const { status, admin_response, admin_notes, priority } = req.body;

    const allowedStatuses = ['Open', 'Under Review', 'Resolved', 'Closed'];
    const updates = {};

    if (status) {
      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({ success: false, message: `Status must be one of: ${allowedStatuses.join(', ')}` });
      }
      updates.status = status;
      if (status === 'Resolved' || status === 'Closed') {
        updates.resolved_at = new Date().toISOString();
        updates.resolved_by = req.user.id;
      }
    }

    if (admin_response !== undefined) {
      updates.admin_response = admin_response ? admin_response.trim() : null;
    }

    if (admin_notes !== undefined) {
      updates.admin_notes = admin_notes ? admin_notes.trim() : null;
    }

    if (priority) {
      updates.priority = priority;
    }

    const updated = db.update('complaints', complaint.id, updates);

    // Notify Student about status change or response
    const student = db.findById('students', complaint.student_id);
    if (student) {
      let notifyMessage = `Your complaint regarding "${complaint.subject}" is now marked as "${updates.status || complaint.status}".`;
      if (updates.admin_response) {
        notifyMessage += ` Admin Response: "${updates.admin_response}"`;
      }

      db.insert('notifications', {
        user_id: student.user_id,
        title: `Complaint Status Update: ${updates.status || complaint.status}`,
        message: notifyMessage,
        type: 'complaint_update',
        is_read: false,
        link: '/student/complaints'
      });
    }

    logAudit(req, 'COMPLAINT_UPDATED', `Complaint #${complaint.id} updated to status '${updates.status || complaint.status}' with admin response.`);

    const enriched = db.getEnrichedComplaint(updated);
    return res.json({
      success: true,
      message: 'Complaint updated and student notified.',
      data: enriched
    });
  } catch (err) {
    console.error('Update complaint error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update complaint.' });
  }
});

export default router;
