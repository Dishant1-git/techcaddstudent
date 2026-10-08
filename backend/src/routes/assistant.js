import express from 'express';
import { requireAuth } from '../middleware/auth.js';
import { answerQuestion } from '../assistant/assistant.js';
import { isConfigured } from '../assistant/groq.js';

const router = express.Router();

const MAX_QUESTION_LENGTH = 1000;

// Per-user limit so one account cannot use up the shared AI quota
const USER_LIMIT = 15;
const USER_WINDOW_MS = 5 * 60 * 1000;
const usage = new Map();

function overUserLimit(userId) {
  const now = Date.now();
  const key = String(userId);
  let record = usage.get(key);
  if (!record || now > record.resetAt) {
    record = { count: 0, resetAt: now + USER_WINDOW_MS };
    usage.set(key, record);
  }
  record.count++;
  return record.count > USER_LIMIT ? Math.ceil((record.resetAt - now) / 1000) : 0;
}

// POST /api/assistant/chat - Ask the Techcadd AI assistant a question
router.post('/chat', requireAuth, async (req, res) => {
  try {
    const message = typeof req.body.message === 'string' ? req.body.message.trim() : '';
    if (!message) {
      return res.status(400).json({ success: false, message: 'Please type a question.' });
    }
    if (message.length > MAX_QUESTION_LENGTH) {
      return res.status(400).json({ success: false, message: `Question cannot exceed ${MAX_QUESTION_LENGTH} characters.` });
    }
    if (!isConfigured()) {
      return res.status(503).json({ success: false, message: 'The AI assistant is not configured on this server yet.' });
    }

    const retryAfterSeconds = overUserLimit(req.user.id);
    if (retryAfterSeconds) {
      return res.status(429).json({
        success: false,
        message: 'You have asked a lot of questions in a short time. Please wait a few minutes and try again.',
        retryAfterSeconds
      });
    }

    const { answer, sources } = await answerQuestion({ message, history: req.body.history });
    return res.json({ success: true, data: { answer, sources } });
  } catch (err) {
    console.error('Assistant chat error:', err.message);
    if (err.status === 429) {
      return res.status(429).json({ success: false, message: 'The assistant is busy right now. Please try again in a minute.' });
    }
    return res.status(502).json({ success: false, message: 'The assistant could not answer right now. Please try again.' });
  }
});

export default router;
