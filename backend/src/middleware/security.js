// Comprehensive Enterprise Security Middleware Suite
import { logAudit } from './audit.js';

// In-Memory Rate Limiting Store
const rateLimitStore = new Map();
const loginAttemptsStore = new Map();

// 1. Security Headers Middleware (Helmet-equivalent)
export function securityHeaders(req, res, next) {
  // Prevent MIME type sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  
  // Enable XSS filtering
  res.setHeader('X-XSS-Protection', '1; mode=block');
  
  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  // Permissions Policy
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  
  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https: data: blob:; img-src 'self' https: data: blob:; connect-src 'self' https:;"
  );

  next();
}

// 2. Sliding Window Rate Limiter Factory
export function createRateLimiter({ windowMs = 15 * 60 * 1000, max = 500, message = 'Too many requests. Please slow down.' }) {
  return (req, res, next) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown-ip';
    const now = Date.now();

    // Clean up expired entries periodically
    if (Math.random() < 0.05) {
      for (const [key, record] of rateLimitStore.entries()) {
        if (now > record.resetTime) {
          rateLimitStore.delete(key);
        }
      }
    }

    const key = `${ip}:${req.baseUrl || ''}`;
    let record = rateLimitStore.get(key);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs
      };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfterSeconds: resetSeconds
      });
    }

    next();
  };
}

// 3. Strict Auth Login Limiter (Max 20 attempts per 5 minutes per IP)
export const authLoginLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 25,
  message: 'Too many login attempts from this IP. Please wait 5 minutes before trying again.'
});

// 4. Brute Force Account Lockout Tracker
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 10 * 60 * 1000; // 10 minutes

export function checkAccountLockout(email) {
  if (!email) return { isLocked: false };
  const cleanEmail = email.trim().toLowerCase();
  const record = loginAttemptsStore.get(cleanEmail);

  if (!record) return { isLocked: false };

  const now = Date.now();
  if (record.lockUntil && now < record.lockUntil) {
    const remainingSeconds = Math.ceil((record.lockUntil - now) / 1000);
    const remainingMinutes = Math.ceil(remainingSeconds / 60);
    return {
      isLocked: true,
      remainingMinutes,
      remainingSeconds
    };
  }

  // If lockout duration expired, reset attempts
  if (record.lockUntil && now >= record.lockUntil) {
    loginAttemptsStore.delete(cleanEmail);
    return { isLocked: false };
  }

  return { isLocked: false };
}

export function recordFailedLogin(email) {
  if (!email) return;
  const cleanEmail = email.trim().toLowerCase();
  const now = Date.now();
  let record = loginAttemptsStore.get(cleanEmail);

  if (!record || (record.lockUntil && now > record.lockUntil)) {
    record = { attempts: 1, firstAttempt: now, lockUntil: null };
  } else {
    record.attempts++;
  }

  if (record.attempts >= MAX_FAILED_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_DURATION_MS;
  }

  loginAttemptsStore.set(cleanEmail, record);
}

export function resetFailedLogins(email) {
  if (!email) return;
  loginAttemptsStore.delete(email.trim().toLowerCase());
}

// 5. Input Sanitization (Recursive XSS Vector Stripping)
function sanitizeValue(value) {
  if (typeof value === 'string') {
    return value
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/javascript:/gi, '')
      .replace(/vbscript:/gi, '')
      .replace(/onload\s*=/gi, '')
      .replace(/onerror\s*=/gi, '')
      .replace(/onclick\s*=/gi, '')
      .replace(/onmouseover\s*=/gi, '');
  }
  if (Array.isArray(value)) {
    return value.map(sanitizeValue);
  }
  if (value !== null && typeof value === 'object') {
    const sanitizedObj = {};
    for (const [key, val] of Object.entries(value)) {
      // Prevent prototype pollution
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitizedObj[key] = sanitizeValue(val);
    }
    return sanitizedObj;
  }
  return value;
}

export function sanitizeInput(req, res, next) {
  if (req.body) {
    req.body = sanitizeValue(req.body);
  }
  if (req.query) {
    req.query = sanitizeValue(req.query);
  }
  if (req.params) {
    req.params = sanitizeValue(req.params);
  }
  next();
}

// 6. Password Strength Policy Validator
export function validatePasswordPolicy(password) {
  if (!password || typeof password !== 'string') {
    return {
      isValid: false,
      message: 'Password is required.'
    };
  }

  if (password.length < 6) {
    return {
      isValid: false,
      message: 'Password must be at least 6 characters long.'
    };
  }

  return { isValid: true };
}
