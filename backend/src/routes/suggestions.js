import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin, requireStudent } from '../middleware/auth.js';
import { logAudit } from '../middleware/audit.js';

const router = express.Router();

export const SUGGESTION_CATEGORIES = ['Classes & Teaching', 'Course Content', 'Timings', 'Facilities', 'Portal / App', 'Other'];
export const SUGGESTION_STATUSES = ['new', 'reviewed', 'planned', 'implemented', 'not_planned'];
const STATUS_LABELS = { new: 'New', reviewed: 'Reviewed', planned: 'Planned', implemented: 'Implemented', not_planned: 'Not Planned' };

const clean = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

// Admin view: anonymous suggestions never reveal who sent them
function forAdmin(sg) {
  const { student_id, ...rest } = sg;
  if (sg.anonymous) return { ...rest, student_name: 'Anonymous', student_code: '', trainer_name: '' };
  const student = db.findById('students', student_id);
  const enriched = student ? db.getEnrichedStudent(student) : null;
  return {
    ...rest,
    student_id,
    student_name: enriched ? enriched.name : 'Unknown Student',
    student_code: enriched ? enriched.student_id : '',
    trainer_name: enriched ? enriched.trainer_name : ''
  };
}

// POST /api/suggestions - Student sends a suggestion
router.post('/', requireAuth, requireStudent, (req, res) => {
  try {
    const student = req.studentProfile;
    if (!student) return res.status(404).json({ success: false, message: 'Student profile not found.' });

    const message = clean(req.body?.message, 2000);
    const title = clean(req.body?.title, 120);
    const category = SUGGESTION_CATEGORIES.includes(req.body?.category) ? req.body.category : 'Other';
    const anonymous = req.body?.anonymous === true;
    if (message.length < 5) {
      return res.status(400).json({ success: false, message: 'Please write your suggestion (at least a few words).' });
    }

    const suggestion = db.insert('suggestions', {
      student_id: student.id,
      title: title || message.slice(0, 60),
      message,
      category,
      anonymous,
      status: 'new',
      admin_reply: '',
      replied_at: null
    });

    const from = anonymous ? 'A student (anonymous)' : req.user.name;
    db.find('users', u => u.role === 'admin').forEach(admin => {
      db.insert('notifications', {
        user_id: admin.id,
        title: 'New Suggestion',
        message: `${from} suggested: "${suggestion.title}" [${category}]`,
        type: 'suggestion',
        link: '/admin/suggestions',
        is_read: false
      });
    });

    logAudit(req, 'SUGGESTION_SUBMITTED', `Suggestion ${suggestion.id} submitted${anonymous ? ' anonymously' : ''} [${category}]`);
    return res.status(201).json({ success: true, message: 'Thank you! Your suggestion has been sent to the admin.', data: suggestion });
  } catch (err) {
    console.error('Submit suggestion error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send your suggestion.' });
  }
});

// GET /api/suggestions/my - Student's own suggestions with admin replies
router.get('/my', requireAuth, requireStudent, (req, res) => {
  const student = req.studentProfile;
  const list = student
    ? db.find('suggestions', s => String(s.student_id) === String(student.id))
        .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    : [];
  return res.json({ success: true, categories: SUGGESTION_CATEGORIES, data: list });
});

// GET /api/suggestions - Admin: all suggestions (?status=new)
router.get('/', requireAuth, requireAdmin, (req, res) => {
  try {
    const { status } = req.query;
    const list = db.find('suggestions', s => !status || s.status === status)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map(forAdmin);
    return res.json({ success: true, count: list.length, categories: SUGGESTION_CATEGORIES, data: list });
  } catch (err) {
    console.error('Fetch suggestions error:', err);
    return res.status(500).json({ success: false, message: 'Failed to load suggestions.' });
  }
});

// PUT /api/suggestions/:id - Admin updates status and/or replies
router.put('/:id', requireAuth, requireAdmin, (req, res) => {
  try {
    const suggestion = db.findById('suggestions', req.params.id);
    if (!suggestion) return res.status(404).json({ success: false, message: 'Suggestion not found.' });

    const updates = {};
    if (req.body?.status !== undefined) {
      if (!SUGGESTION_STATUSES.includes(req.body.status)) {
        return res.status(400).json({ success: false, message: 'Unknown status.' });
      }
      updates.status = req.body.status;
    }
    const reply = req.body?.admin_reply !== undefined ? clean(req.body.admin_reply, 1000) : undefined;
    if (reply !== undefined && reply !== suggestion.admin_reply) {
      updates.admin_reply = reply;
      updates.replied_at = reply ? new Date().toISOString() : null;
    }
    if (Object.keys(updates).length === 0) {
      return res.json({ success: true, message: 'Nothing changed.', data: forAdmin(suggestion) });
    }
    if (!updates.status && suggestion.status === 'new') updates.status = 'reviewed';

    const updated = db.update('suggestions', suggestion.id, updates);

    // Let the student know (anonymous suggestions still reach their author)
    const student = db.findById('students', suggestion.student_id);
    if (student) {
      const parts = [];
      if (updates.status && updates.status !== suggestion.status) parts.push(`status is now "${STATUS_LABELS[updates.status]}"`);
      if (updates.admin_reply) parts.push(`admin replied: "${updates.admin_reply}"`);
      if (parts.length) {
        db.insert('notifications', {
          user_id: student.user_id,
          title: 'Update on Your Suggestion',
          message: `Your suggestion "${suggestion.title}" — ${parts.join('; ')}.`,
          type: 'suggestion',
          link: '/student/suggestions',
          is_read: false
        });
      }
    }

    logAudit(req, 'SUGGESTION_UPDATED', `Suggestion ${suggestion.id} updated (${Object.keys(updates).join(', ')})`);
    return res.json({ success: true, message: 'Suggestion updated.', data: forAdmin(updated) });
  } catch (err) {
    console.error('Update suggestion error:', err);
    return res.status(500).json({ success: false, message: 'Failed to update suggestion.' });
  }
});

export default router;
