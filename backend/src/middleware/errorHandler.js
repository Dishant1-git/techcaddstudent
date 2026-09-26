/**
 * Centralized global error handling middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('[Error Handler]', err);

  const status = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(status).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
}

export default errorHandler;
