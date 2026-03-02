const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const router = express.Router();

/**
 * Username format: (First 4 letters of first name)-(Batch)@(last 2 letters of last name)
 * e.g. Shub-2024@vs
 */
function generateUsername(firstName, lastName, batchYear) {
  const firstPart = firstName.slice(0, 4).toLowerCase().padEnd(4, 'x');
  const batch = String(batchYear).replace(/\D/g, '').slice(0, 4) || '0000';
  const lastPart = lastName.slice(-2).toLowerCase().padStart(2, 'x');
  return `${firstPart}-${batch}@${lastPart}`;
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { firstName, lastName, batchYear, email, password, confirmPassword, username: bodyUsername } = req.body;

    if (!firstName || !lastName || !batchYear || !email || !password || !confirmPassword) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Password and Confirm password do not match' });
    }

    if (!email.toLowerCase().endsWith('@nid.edu')) {
      return res.status(400).json({ error: 'Only @nid.edu email addresses are allowed' });
    }

    const [existing] = await db.query('SELECT id FROM users WHERE email = ?', [email.toLowerCase()]);
    if (existing.length > 0) {
      return res.status(400).json({ error: 'This email is already registered' });
    }

    let username = (bodyUsername || '').trim();
    if (!username) {
      username = generateUsername(firstName, lastName, batchYear);
    }

    if (username.length < 3 || username.length > 100) {
      return res.status(400).json({ error: 'Username must be between 3 and 100 characters' });
    }

    const [existingUsername] = await db.query('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUsername.length > 0) {
      return res.status(400).json({ error: 'This username is already taken. Please choose a different one.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      'INSERT INTO users (first_name, last_name, batch_year, email, username, password_hash) VALUES (?, ?, ?, ?, ?, ?)',
      [firstName.trim(), lastName.trim(), String(batchYear).trim(), email.toLowerCase(), username, hash]
    );

    req.session.userId = result.insertId;
    req.session.username = username;
    req.session.firstName = firstName;
    req.session.lastName = lastName;

    res.json({
      success: true,
      username,
      message: 'Account created successfully. Your username is: ' + username
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const [rows] = await db.query(
      'SELECT id, username, first_name, last_name, password_hash FROM users WHERE username = ?',
      [username.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const user = rows[0];
    const match = await bcrypt.compare(password, user.password_hash);
    if (!match) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    req.session.userId = user.id;
    req.session.username = user.username;
    req.session.firstName = user.first_name;
    req.session.lastName = user.last_name;

    res.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.first_name,
        lastName: user.last_name
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy();
  res.json({ success: true });
});

// GET /api/auth/me
router.get('/me', (req, res) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: 'Not logged in' });
  }
  res.json({
    userId: req.session.userId,
    username: req.session.username,
    firstName: req.session.firstName,
    lastName: req.session.lastName
  });
});

module.exports = router;
