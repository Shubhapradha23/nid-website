const express = require('express');
const db = require('../config/db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/user/profile - Get current user profile
router.get('/profile', async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.first_name, u.last_name, u.batch_year, u.email, u.username, u.created_at,
              s.marks as sem1_marks, s.updated_at as sem1_updated
       FROM users u
       LEFT JOIN sem_marks s ON u.id = s.user_id
       WHERE u.id = ?`,
      [req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const r = rows[0];
    res.json({
      firstName: r.first_name,
      lastName: r.last_name,
      batchYear: r.batch_year,
      email: r.email,
      username: r.username,
      createdAt: r.created_at,
      sem1Marks: r.sem1_marks,
      sem1Updated: r.sem1_updated
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PUT /api/user/sem1 - Save Sem1 marks
router.put('/sem1', async (req, res) => {
  try {
    const marks = req.body.marks;
    if (marks === undefined || marks === null || marks === '') {
      return res.status(400).json({ error: 'Marks value is required' });
    }
    const num = parseFloat(marks);
    if (isNaN(num) || num < 0 || num > 1000) {
      return res.status(400).json({ error: 'Marks must be a valid number (0-1000)' });
    }

    await db.query(
      `INSERT INTO sem_marks (user_id, marks) VALUES (?, ?)
       ON DUPLICATE KEY UPDATE marks = VALUES(marks)`,
      [req.session.userId, num]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to save marks' });
  }
});

// GET /api/user/disciplines - Get list of disciplines for preference input
router.get('/disciplines', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT id, name FROM disciplines ORDER BY id');
    res.json({ disciplines: rows });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch disciplines' });
  }
});

module.exports = router;
