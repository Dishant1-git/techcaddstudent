import express from 'express';
import authRoutes from './auth.js';
import studentRoutes from './students.js';
import trainerRoutes from './trainers.js';
import courseRoutes from './courses.js';
import batchRoutes from './batches.js';
import attendanceRoutes from './attendance.js';
import complaintRoutes from './complaints.js';
import notificationRoutes from './notifications.js';
import analyticsRoutes from './analytics.js';
import auditRoutes from './audit.js';
import uploadRoutes from './uploads.js';

const router = express.Router();

// Health Check
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Student Attendance & Complaint Management Portal'
  });
});

// Mount Subroutes
router.use('/auth', authRoutes);
router.use('/students', studentRoutes);
router.use('/trainers', trainerRoutes);
router.use('/courses', courseRoutes);
router.use('/batches', batchRoutes);
router.use('/attendance', attendanceRoutes);
router.use('/complaints', complaintRoutes);
router.use('/notifications', notificationRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/uploads', uploadRoutes);

export default router;
