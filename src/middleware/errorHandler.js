'use strict';

const path = require('path');
const isDev = (process.env.NODE_ENV || 'development') === 'development';

/**
 * 404 handler — must be registered after all valid routes.
 */
function notFound(req, res, next) {
  const err = new Error(`Not Found: ${req.method} ${req.originalUrl}`);
  err.status = 404;
  next(err);
}

/**
 * Global error handler — four-argument signature required by Express.
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const status = err.status || 500;

  // API requests get a JSON error envelope
  if (req.originalUrl.startsWith('/api')) {
    return res.status(status).json({
      success: false,
      error:   err.message,
      ...(isDev && { stack: err.stack }),
    });
  }

  // Browser requests: serve 404 page or a minimal inline response
  if (status === 404) {
    return res.status(404).sendFile(
      path.join(__dirname, '../../public/index.html'),
      sendErr => { if (sendErr) res.status(404).send('<h1>404 – Page Not Found</h1>'); }
    );
  }

  res.status(status).send(
    isDev
      ? `<pre style="font-family:monospace;padding:2rem">${err.stack}</pre>`
      : '<h1>500 – Something went wrong</h1>'
  );
}

module.exports = { notFound, errorHandler };
