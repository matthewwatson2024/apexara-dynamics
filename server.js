'use strict';

require('dotenv').config();

const express    = require('express');
const path       = require('path');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');

const pageRoutes = require('./src/routes/pages');
const apiRoutes  = require('./src/routes/api');
const { notFound, errorHandler } = require('./src/middleware/errorHandler');
const requestLogger = require('./src/middleware/requestLogger');

const app  = express();
const PORT = process.env.PORT || 3000;
const ENV  = process.env.NODE_ENV || 'development';
const isDev = ENV === 'development';

// ── Security headers ──────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc:  ["'self'", "'unsafe-inline'", "cdnjs.cloudflare.com", "fonts.googleapis.com"],
        styleSrc:   ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
        fontSrc:    ["'self'", "fonts.gstatic.com"],
        imgSrc:     ["'self'", "data:", "blob:"],
        connectSrc: ["'self'"],
      },
    },
    crossOriginEmbedderPolicy: false,
  })
);

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(isDev ? morgan('dev') : morgan('combined'));
app.use(requestLogger);

// ── Body parsing (ready for future API routes) ────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ── Static assets ─────────────────────────────────────────────────────────────
app.use(
  express.static(path.join(__dirname, 'public'), {
    maxAge: isDev ? 0 : '7d',
    etag: true,
    lastModified: true,
  })
);

// ── API routes  (mounted at /api — isolated from page routes) ─────────────────
app.use('/api', apiRoutes);

// ── Page routes ───────────────────────────────────────────────────────────────
app.use('/', pageRoutes);

// ── 404 + global error handler ────────────────────────────────────────────────
app.use(notFound);
app.use(errorHandler);

// ── Start ─────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`\n  Apexara Dynamics server`);
  console.log(`  ─────────────────────────────────────`);
  console.log(`  Env  : ${ENV}`);
  console.log(`  URL  : http://localhost:${PORT}`);
  console.log(`  ─────────────────────────────────────\n`);
});

module.exports = app;
