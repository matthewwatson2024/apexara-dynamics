'use strict';

/**
 * Lightweight structured request logger — augments morgan with section context.
 * Skips static asset noise (images, css, js) to keep logs readable.
 */
const SKIP_EXTS = /\.(css|js|jpg|jpeg|png|gif|webp|svg|ico|woff2?|ttf|map)$/i;

function requestLogger(req, res, next) {
  if (SKIP_EXTS.test(req.path)) return next();

  const started = Date.now();

  res.on('finish', () => {
    const ms      = Date.now() - started;
    const section = res.getHeader('X-Section') || '-';
    const code    = res.statusCode;
    const colour  = code >= 500 ? 31 : code >= 400 ? 33 : code >= 300 ? 36 : 32;

    process.stdout.write(
      `  \x1b[${colour}m${code}\x1b[0m  ${req.method.padEnd(6)} ${req.originalUrl.padEnd(24)} `
      + `section=${section.padEnd(14)} ${ms}ms\n`
    );
  });

  next();
}

module.exports = requestLogger;
