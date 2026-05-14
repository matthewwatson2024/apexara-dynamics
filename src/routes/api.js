'use strict';

const express = require('express');

const router = express.Router();

// ── Health check ──────────────────────────────────────────────────────────────
router.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  });
});

// ── Contact form submission ───────────────────────────────────────────────────
// Placeholder — wire up an email service (SendGrid, Resend, etc.) here.
router.post('/contact', (req, res) => {
  const { firstName, lastName, email, organization, inquiry, message } = req.body;

  if (!firstName || !email || !message) {
    return res.status(400).json({
      success: false,
      error: 'firstName, email, and message are required.',
    });
  }

  // TODO: forward payload to email service
  console.log('[contact]', { firstName, lastName, email, organization, inquiry, message });

  return res.status(200).json({
    success: true,
    message: 'Inquiry received. A team member will be in contact within one business day.',
  });
});

// ── Capabilities list ─────────────────────────────────────────────────────────
// Placeholder — replace with a database query when ready.
router.get('/capabilities', (_req, res) => {
  res.json({
    success: true,
    data: [
      { id: 1, slug: 'autonomous-flight',   title: 'Autonomous Flight Systems' },
      { id: 2, slug: 'precision-mapping',   title: 'Precision Mapping & Surveying' },
      { id: 3, slug: 'ai-analytics',        title: 'AI-Powered Analytics' },
      { id: 4, slug: 'defense-security',    title: 'Defense & Security' },
      { id: 5, slug: 'inspection',          title: 'Inspection & Monitoring' },
      { id: 6, slug: 'agriculture',         title: 'Precision Agriculture' },
      { id: 7, slug: 'emergency-response',  title: 'Emergency Response' },
    ],
  });
});

module.exports = router;
