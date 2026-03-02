const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Simple hardcoded admin credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin';

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.status(401).json({ error: 'Admin login required' });
}

// POST /api/admin/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
    req.session.isAdmin = true;
    return res.json({ success: true });
  }

  return res.status(401).json({ error: 'Invalid admin credentials' });
});

// POST /api/admin/logout
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.isAdmin = false;
  }
  res.json({ success: true });
});

// GET /api/admin/me
router.get('/me', (req, res) => {
  if (!req.session || !req.session.isAdmin) {
    return res.status(401).json({ error: 'Not logged in as admin' });
  }
  res.json({ isAdmin: true });
});

// GET /api/admin/users - list all users with latest preferences and sem1 marks
router.get('/users', requireAdmin, async (req, res) => {
  try {
    // Base user info + sem1 marks
    const [users] = await db.query(
      `SELECT u.id, u.first_name, u.last_name, u.batch_year, u.email, u.username,
              u.created_at, s.marks AS sem1_marks
       FROM users u
       LEFT JOIN sem_marks s ON u.id = s.user_id
       ORDER BY u.created_at DESC`
    );

    if (users.length === 0) {
      return res.json({ users: [] });
    }

    const userIds = users.map(u => u.id);

    // Latest preferences per user
    const [prefs] = await db.query(
      `SELECT pv.*
       FROM preference_versions pv
       INNER JOIN (
         SELECT user_id, MAX(version) AS maxv
         FROM preference_versions
         GROUP BY user_id
       ) t ON pv.user_id = t.user_id AND pv.version = t.maxv
       WHERE pv.user_id IN (${userIds.map(() => '?').join(',')})`,
      userIds
    );

    const [disciplines] = await db.query(
      'SELECT id, name FROM disciplines ORDER BY id'
    );

    const discById = {};
    disciplines.forEach(d => {
      discById[d.id] = d.name;
    });

    const prefsByUser = {};
    prefs.forEach(p => {
      prefsByUser[p.user_id] = {
        version: p.version,
        createdAt: p.created_at,
        prefs: [
          p.pref_1,
          p.pref_2,
          p.pref_3,
          p.pref_4,
          p.pref_5,
          p.pref_6,
          p.pref_7,
          p.pref_8
        ]
      };
    });

    const result = users.map(u => {
      const pref = prefsByUser[u.id];
      const prefNames = pref
        ? pref.prefs.map(id => discById[id] || `Discipline ${id}`)
        : null;

      return {
        id: u.id,
        firstName: u.first_name,
        lastName: u.last_name,
        batchYear: u.batch_year,
        email: u.email,
        username: u.username,
        createdAt: u.created_at,
        sem1Marks: u.sem1_marks,
        preferences: prefNames,
        preferencesVersion: pref ? pref.version : null,
        preferencesUpdatedAt: pref ? pref.createdAt : null
      };
    });

    res.json({ users: result });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch users for admin' });
  }
});

module.exports = router;

