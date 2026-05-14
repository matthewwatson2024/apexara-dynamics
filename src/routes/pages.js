'use strict';

const express = require('express');
const path    = require('path');

const router = express.Router();

// All page routes serve the same SPA shell. The path is forwarded to the
// client via a <meta> tag so the JS can scroll to the matching section on load.
const HTML = path.join(__dirname, '../../public/index.html');

const SECTION_MAP = {
  '/':             'hero',
  '/overview':     'overview',
  '/capabilities': 'capabilities',
  '/technology':   'technology',
  '/gallery':      'gallery',
  '/contact':      'contact',
};

function servePage(section) {
  return (_req, res) => {
    // Pass the target section as a query param in the ETag so the browser can
    // cache per-section; actual scroll behaviour is handled client-side.
    res.setHeader('X-Section', section);
    res.sendFile(HTML, err => {
      if (err) res.status(500).end();
    });
  };
}

Object.entries(SECTION_MAP).forEach(([route, section]) => {
  router.get(route, servePage(section));
});

module.exports = router;
