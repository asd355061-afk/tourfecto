const db = require('../db');

// POST /api/places/:id/reviews  (يتطلب تسجيل دخول)
// body: { rating, title, body }
function create(req, res) {
  const placeId = req.params.id;
  const place = db.prepare('SELECT id FROM places WHERE id = ?').get(placeId);
  if (!place) return res.status(404).json({ error: 'المكان غير موجود' });

  const { rating, title, body } = req.body;
  const r = Number(rating);
  if (!r || r < 1 || r > 5) {
    return res.status(400).json({ error: 'التقييم يجب أن يكون رقمًا من 1 إلى 5' });
  }
  if (!body || !body.trim()) {
    return res.status(400).json({ error: 'نص التقييم مطلوب' });
  }

  // منع أكثر من تقييم واحد لنفس المستخدم لنفس المكان
  const existing = db
    .prepare('SELECT id FROM reviews WHERE place_id = ? AND user_id = ?')
    .get(placeId, req.user.id);
  if (existing) {
    return res.status(409).json({ error: 'لقد قمت بتقييم هذا المكان من قبل' });
  }

  const info = db
    .prepare(
      'INSERT INTO reviews (place_id, user_id, rating, title, body) VALUES (?, ?, ?, ?, ?)'
    )
    .run(placeId, req.user.id, r, title || '', body.trim());

  const review = db
    .prepare(
      `SELECT reviews.*, users.name AS user_name
       FROM reviews JOIN users ON users.id = reviews.user_id WHERE reviews.id = ?`
    )
    .get(info.lastInsertRowid);

  res.status(201).json({ review });
}

// GET /api/places/:id/reviews
function listByPlace(req, res) {
  const reviews = db
    .prepare(
      `SELECT reviews.*, users.name AS user_name
       FROM reviews JOIN users ON users.id = reviews.user_id
       WHERE place_id = ? ORDER BY reviews.created_at DESC`
    )
    .all(req.params.id);
  res.json({ reviews });
}

module.exports = { create, listByPlace };
