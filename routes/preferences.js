const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// POST /api/preferences - Save preferences (creates new version)
router.post('/', async (req, res) => {
  try {
    const userId = req.session.userId;
    const { pref1, pref2, pref3, pref4, pref5, pref6, pref7, pref8 } = req.body;

    const prefs = [pref1, pref2, pref3, pref4, pref5, pref6, pref7, pref8];
    if (prefs.some(p => !p || p < 1 || p > 8)) {
      return res.status(400).json({ error: 'Each preference must be a discipline ID 1-8' });
    }

    const unique = new Set(prefs);
    if (unique.size !== 8) {
      return res.status(400).json({ error: 'All 8 disciplines must be ranked uniquely (no duplicates)' });
    }

    const [maxRow] = await db.query(
      'SELECT COALESCE(MAX(version), 0) as v FROM preference_versions WHERE user_id = ?',
      [userId]
    );
    const nextVersion = (maxRow[0].v || 0) + 1;

    await db.query(
      `INSERT INTO preference_versions (user_id, version, pref_1, pref_2, pref_3, pref_4, pref_5, pref_6, pref_7, pref_8)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, nextVersion, pref1, pref2, pref3, pref4, pref5, pref6, pref7, pref8]
    );

    res.json({ success: true, version: nextVersion });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save preferences' });
  }
});

// GET /api/preferences - Get current user's latest preferences
router.get('/', async (req, res) => {
  try {
    const userId = req.session.userId;

    const [rows] = await db.query(
      `SELECT version, pref_1, pref_2, pref_3, pref_4, pref_5, pref_6, pref_7, pref_8, created_at
       FROM preference_versions WHERE user_id = ? ORDER BY version DESC LIMIT 1`,
      [userId]
    );

    if (rows.length === 0) {
      return res.json({ preferences: null });
    }

    const r = rows[0];
    res.json({
      preferences: {
        version: r.version,
        prefs: [r.pref_1, r.pref_2, r.pref_3, r.pref_4, r.pref_5, r.pref_6, r.pref_7, r.pref_8],
        createdAt: r.created_at
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch preferences' });
  }
});

module.exports = router;
