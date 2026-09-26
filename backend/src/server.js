import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';

import config from './config/index.js';
import { seedDatabase } from './db/seed.js';
import { securityHeaders, sanitizeInput, createRateLimiter } from './middleware/security.js';
import { errorHandler } from './middleware/errorHandler.js';
import apiRoutes from './routes/index.js';

const app = express();

// Security Hardening: Disable server fingerprinting
app.disable('x-powered-by');

// Security Headers (Helmet-like protection)
app.use(securityHeaders);

// CORS Policy
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body Parsing with Size Limits (Prevents payload-based DoS)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Input Sanitization (Prevents XSS vectors and prototype pollution)
app.use(sanitizeInput);

// Global API Rate Limiter (Max 1000 requests per 15 minutes per IP)
app.use('/api', createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: 'API rate limit exceeded. Please try again in 15 minutes.'
}));

// Static uploads directory
if (!fs.existsSync(config.uploadDir)) {
  fs.mkdirSync(config.uploadDir, { recursive: true });
}
app.use('/uploads', express.static(config.uploadDir));

// Mount Unified API Routes
app.use('/api', apiRoutes);

// Serve frontend in production if built
if (fs.existsSync(config.distDir)) {
  app.use(express.static(config.distDir));
  app.get('*', (req, res) => {
    res.sendFile(path.join(config.distDir, 'index.html'));
  });
}

// Global Error Handler
app.use(errorHandler);

// Auto seed and launch with resilient port conflict handling
async function startServer(port = config.port) {
  await seedDatabase();
  const server = app.listen(port, '0.0.0.0', () => {
    console.log(`=======================================================`);
    console.log(` Educational Portal Backend is LIVE!`);
    console.log(` Port:    ${port}`);
    console.log(` Mode:    ${config.nodeEnv}`);
    console.log(` Health:  http://localhost:${port}/api/health`);
    console.log(`=======================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      const nextPort = Number(port) + 1;
      console.warn(`\n⚠️  [Port Conflict] Port ${port} is already in use (common with macOS AirPlay Receiver).`);
      console.log(`👉 [Auto-Recovery] Attempting port ${nextPort}...\n`);
      startServer(nextPort);
    } else {
      console.error('[Server Error]', err);
    }
  });
}

// Only start when executed directly (not when imported for testing)
import { pathToFileURL } from 'url';
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun && process.env.NODE_ENV !== 'test') {
  startServer();
}

export default app;
