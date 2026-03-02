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

// GET /api/rankings/cutoff - Get cut-off ranking (uses latest version per user)
router.get('/cutoff', async (req, res) => {
  try {
    const [latest] = await db.query(`
      SELECT pv.* FROM preference_versions pv
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

    const scores = computeCutoffScores(positionCounts);
    const [disciplines] = await db.query('SELECT id, name FROM disciplines ORDER BY id');

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
