const express = require('express');
const db = require('../config/db');

const router = express.Router();

/**
 * Cut-off ranking formula:
 * n = position (1 to 8)
 * i_n = number of votes a discipline received at position n
 * totalPositions = 8
 * a_n = (totalPositions - n + 1) / totalPositions
 * x = Σ (i_n × a_n)
 * Higher x ⇒ higher expected cutoff.
 */
function computeCutoffScores(positionCounts) {
  const totalPositions = 8;
  const disciplineIds = [1, 2, 3, 4, 5, 6, 7, 8];
  const scores = {};

  for (const did of disciplineIds) {
    let x = 0;
    for (let n = 1; n <= totalPositions; n++) {
      const a_n = (totalPositions - n + 1) / totalPositions;
      const i_n = positionCounts[did]?.[n] || 0;
      x += i_n * a_n;
    }
    scores[did] = x;
  }

  return scores;
}

function parseSeatsConfig(disciplineIds) {
  // Optional env override, e.g. {"1":30,"2":30,...}
  const fromEnv = process.env.DISCIPLINE_SEATS_JSON;
  if (fromEnv) {
    try {
      const parsed = JSON.parse(fromEnv);
      const seats = {};
      disciplineIds.forEach(id => {
        const v = Number(parsed[id] ?? parsed[String(id)] ?? 0);
        seats[id] = Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
      });
      return seats;
    } catch (_) {
      // Fall through to default seats below
    }
  }

  // Default seat configuration (used only for cutoff estimation)
  const seats = {};
  disciplineIds.forEach(id => {
    seats[id] = 30;
  });
  return seats;
}

function gaussianRandom(mean, stdDev) {
  // Box-Muller transform
  const u = 1 - Math.random();
  const v = 1 - Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return mean + z * stdDev;
}

function buildMockPreferences(demandOrderedIds) {
  // Keep current ordering logic as base, then rotate for diversity.
  const shift = Math.floor(Math.random() * demandOrderedIds.length);
  const rotated = demandOrderedIds.map((_, idx) => demandOrderedIds[(idx + shift) % demandOrderedIds.length]);
  return rotated;
}

function allocateCutoffs(users, disciplineIds, seatsTemplate) {
  const remainingSeats = { ...seatsTemplate };
  const cutoffScores = {};
  disciplineIds.forEach(id => {
    cutoffScores[id] = 0;
  });

  users.sort((a, b) => b.score - a.score);

  for (const user of users) {
    for (const did of user.preferences) {
      if ((remainingSeats[did] || 0) > 0) {
        remainingSeats[did] -= 1;
        // Cutoff becomes score of the latest admitted user for that discipline.
        cutoffScores[did] = user.score;
        break;
      }
    }

    if (Object.values(remainingSeats).every(v => v <= 0)) {
      break;
    }
  }

  return cutoffScores;
}

// GET /api/rankings/cutoff - Get cut-off ranking (uses latest version per user)
router.get('/cutoff', async (req, res) => {
  try {
    const [latest] = await db.query(`
      SELECT pv.*, s.marks AS score
      FROM preference_versions pv
      LEFT JOIN sem_marks s ON s.user_id = pv.user_id
      INNER JOIN (
        SELECT user_id, MAX(version) as maxv
        FROM preference_versions
        GROUP BY user_id
      ) t ON pv.user_id = t.user_id AND pv.version = t.maxv
    `);

    const positionCounts = {};
    for (let d = 1; d <= 8; d++) {
      positionCounts[d] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0, 8: 0 };
    }

    for (const row of latest) {
      const prefs = [row.pref_1, row.pref_2, row.pref_3, row.pref_4, row.pref_5, row.pref_6, row.pref_7, row.pref_8];
      for (let pos = 1; pos <= 8; pos++) {
        const did = prefs[pos - 1];
        if (did >= 1 && did <= 8) {
          positionCounts[did][pos]++;
        }
      }
    }

    // Keep demand calculation intact (used for ordering context and mock generation).
    const demandScores = computeCutoffScores(positionCounts);
    const [disciplines] = await db.query('SELECT id, name FROM disciplines ORDER BY id');
    const disciplineIds = disciplines.map(d => d.id);

    // Build allocation users from existing dataset structure.
    const allocationUsers = latest.map(row => ({
      score: Number(row.score),
      preferences: [row.pref_1, row.pref_2, row.pref_3, row.pref_4, row.pref_5, row.pref_6, row.pref_7, row.pref_8]
    }));

    // Fill missing/invalid scores with current average.
    const validScores = allocationUsers.map(u => u.score).filter(s => Number.isFinite(s));
    const avgScore = validScores.length > 0
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length
      : 60;
    allocationUsers.forEach(u => {
      if (!Number.isFinite(u.score)) u.score = avgScore;
    });

    // If user count is low, add temporary mock users for more stable estimates.
    const MIN_USERS_FOR_STABILITY = 50;
    if (allocationUsers.length < MIN_USERS_FOR_STABILITY) {
      const demandOrderedIds = [...disciplineIds].sort((a, b) => (demandScores[b] || 0) - (demandScores[a] || 0));
      const stdDev = Math.max(5, avgScore * 0.12);
      const needed = MIN_USERS_FOR_STABILITY - allocationUsers.length;
      for (let i = 0; i < needed; i++) {
        let score = gaussianRandom(avgScore, stdDev);
        if (!Number.isFinite(score)) score = avgScore;
        score = Math.max(0, Math.min(1000, score));
        allocationUsers.push({
          score,
          preferences: buildMockPreferences(demandOrderedIds)
        });
      }
    }

    const seatsTemplate = parseSeatsConfig(disciplineIds);
    const scores = allocateCutoffs(allocationUsers, disciplineIds, seatsTemplate);

    const ranking = disciplines.map(d => ({
      id: d.id,
      name: d.name,
      score: scores[d.id] || 0
    })).sort((a, b) => b.score - a.score);

    res.json({
      ranking,
      positionCounts,
      totalResponses: latest.length
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to compute rankings' });
  }
});

module.exports = router;
