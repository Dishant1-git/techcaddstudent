import express from 'express';
import { db } from '../db/database.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';
import { pushToThread } from '../realtime.js';

const router = express.Router();

const MAX_MESSAGE_LENGTH = 2000;

// Every student/trainer has exactly one thread with the administration, keyed
// by their user id. Admins share a single inbox, so any admin can read and
// reply to any thread.
function resolveThreadUser(req, requestedUserId) {
  if (req.user.role !== 'admin') return db.findById('users', req.user.id);
  const user = db.findById('users', requestedUserId);
  return user && user.role !== 'admin' ? user : null;
}

function toMessageView(message) {
  const sender = db.findById('users', message.sender_id);
  return {
    id: message.id,
    thread_user_id: message.thread_user_id,
    sender_id: message.sender_id,
    sender_role: message.sender_role,
    sender_name: sender ? sender.name : (message.sender_role === 'admin' ? 'Administration' : 'Unknown User'),
    body: message.body,
    read_at: message.read_at,
    created_at: message.created_at
  };
}

// GET /api/messages/conversations - Admin inbox: one row per student/trainer
router.get('/conversations', requireAuth, requireAdmin, (req, res) => {
  try {
    const threads = new Map();
    db.find('messages').forEach(m => {
      const key = String(m.thread_user_id);
      const thread = threads.get(key) || { last: null, unread: 0 };
      if (!thread.last || new Date(m.created_at) > new Date(thread.last.created_at)) thread.last = m;
      if (m.sender_role !== 'admin' && !m.read_at) thread.unread++;
      threads.set(key, thread);
    });

    // Users without messages are listed too so an admin can start a conversation
    const conversations = db
      .find('users', u => u.role !== 'admin' && (u.status === 'active' || threads.has(String(u.id))))
      .map(u => {
        const thread = threads.get(String(u.id));
        const student = u.role === 'student' ? db.findOne('students', s => String(s.user_id) === String(u.id)) : null;
        return {
          user_id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          avatar: u.avatar || null,
          student_code: student ? student.student_id : null,
          unread_count: thread ? thread.unread : 0,
          last_message: thread
            ? { body: thread.last.body, sender_role: thread.last.sender_role, created_at: thread.last.created_at }
            : null
        };
      })
      .sort((a, b) => {
        if (a.last_message && b.last_message) {
          return new Date(b.last_message.created_at) - new Date(a.last_message.created_at);
        }
        if (a.last_message || b.last_message) return a.last_message ? -1 : 1;
        return a.name.localeCompare(b.name);
      });

    return res.json({ success: true, count: conversations.length, data: conversations });
  } catch (err) {
    console.error('Fetch conversations error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve conversations.' });
  }
});

// GET /api/messages/thread/:userId? - Messages of one thread, oldest first.
// Students/trainers always get their own thread; admins must pass a user id.
// Opening a thread marks the other side's messages as read.
router.get('/thread/:userId?', requireAuth, (req, res) => {
  try {
    const threadUser = resolveThreadUser(req, req.params.userId);
    if (!threadUser) {
      return res.status(404).json({ success: false, message: 'Conversation not found.' });
    }

    const isAdmin = req.user.role === 'admin';
    const now = new Date().toISOString();
    let markedRead = 0;

    const messages = db
      .find('messages', m => String(m.thread_user_id) === String(threadUser.id))
      .map(m => {
        const fromOtherSide = isAdmin ? m.sender_role !== 'admin' : m.sender_role === 'admin';
        if (fromOtherSide && !m.read_at) {
          markedRead++;
          return db.update('messages', m.id, { read_at: now });
        }
        return m;
      })
      .sort((a, b) => new Date(a.created_at) - new Date(b.created_at) || a.id - b.id)
      .map(toMessageView);

    // Clears the unread badge on the reader's other tabs (and for other admins)
    if (markedRead > 0) {
      pushToThread(threadUser.id, { type: 'thread:read', thread_user_id: threadUser.id }, isAdmin ? 'admin' : 'user');
    }

    return res.json({
      success: true,
      count: messages.length,
      markedRead,
      user: { id: threadUser.id, name: threadUser.name, email: threadUser.email, role: threadUser.role },
      data: messages
    });
  } catch (err) {
    console.error('Fetch message thread error:', err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
});

// POST /api/messages - Send a text message. Admins must pass the target user_id.
router.post('/', requireAuth, (req, res) => {
  try {
    const body = typeof req.body.body === 'string' ? req.body.body.trim() : '';
    if (!body) {
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });
    }
    if (body.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ success: false, message: `Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.` });
    }

    const threadUser = resolveThreadUser(req, req.body.user_id);
    if (!threadUser) {
      return res.status(404).json({ success: false, message: 'Recipient not found.' });
    }

    const message = db.insert('messages', {
      thread_user_id: threadUser.id,
      sender_id: req.user.id,
      sender_role: req.user.role === 'admin' ? 'admin' : 'user',
      body,
      read_at: null
    });

    const view = toMessageView(message);
    pushToThread(threadUser.id, { type: 'message:new', message: view });

    return res.status(201).json({ success: true, data: view });
  } catch (err) {
    console.error('Send message error:', err);
    return res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
});

export default router;
