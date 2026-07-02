const db = require('../db');

function withRatingStats(place) {
  const row = db
    .prepare('SELECT COUNT(*) AS count, AVG(rating) AS avg FROM reviews WHERE place_id = ?')
    .get(place.id);
  return {
    ...place,
    rating: row.avg ? Math.round(row.avg * 10) / 10 : 0,
    reviewsCount: row.count || 0,
  };
}

// GET /api/places?category=&city=&q=&sort=top|reviews
function list(req, res) {
  const { category, city, q, sort } = req.query;
  let sql = 'SELECT * FROM places WHERE 1=1';
  const params = [];

  if (category && category !== 'all') {
    sql += ' AND category = ?';
    params.push(category);
  }
  if (city) {
    sql += ' AND city LIKE ?';
    params.push(`%${city}%`);
  }
  if (q) {
    sql += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${q}%`, `%${q}%`);
  }

  let places = db.prepare(sql).all(...params).map(withRatingStats);

  if (sort === 'reviews') {
    places.sort((a, b) => b.reviewsCount - a.reviewsCount);
  } else {
    places.sort((a, b) => b.rating - a.rating);
  }

  res.json({ places });
}

// GET /api/places/:id
function getOne(req, res) {
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'المكان غير موجود' });

  // تسجيل مشاهدة (يستخدمها المورد لاحقًا في الإحصائيات)
  db.prepare('INSERT INTO place_views (place_id) VALUES (?)').run(place.id);

  const reviews = db
    .prepare(
      `SELECT reviews.*, users.name AS user_name
       FROM reviews JOIN users ON users.id = reviews.user_id
       WHERE place_id = ? ORDER BY reviews.created_at DESC`
    )
    .all(place.id);

  res.json({ place: withRatingStats(place), reviews });
}

// POST /api/places   (المورد فقط)
// body: { category, city, name, description, price, icon }
function create(req, res) {
  const { category, city, name, description, price, icon } = req.body;
  if (!category || !city || !name) {
    return res.status(400).json({ error: 'النوع والمدينة والاسم حقول مطلوبة' });
  }
  const allowed = ['hotel', 'restaurant', 'attraction'];
  if (!allowed.includes(category)) {
    return res.status(400).json({ error: 'نوع غير صحيح' });
  }

  const info = db
    .prepare(
      `INSERT INTO places (vendor_id, category, city, name, description, price, icon)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(req.user.id, category, city, name, description || '', price || 0, icon || '📍');

  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json({ place: withRatingStats(place) });
}

// PUT /api/places/:id  (المورد صاحب المكان فقط)
function update(req, res) {
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'المكان غير موجود' });
  if (place.vendor_id !== req.user.id) {
    return res.status(403).json({ error: 'لا يمكنك تعديل مكان لا تملكه' });
  }

  const fields = ['category', 'city', 'name', 'description', 'price', 'icon'];
  const updates = [];
  const params = [];
  fields.forEach((f) => {
    if (req.body[f] !== undefined) {
      updates.push(`${f} = ?`);
      params.push(req.body[f]);
    }
  });
  if (!updates.length) return res.status(400).json({ error: 'لا يوجد بيانات لتحديثها' });

  params.push(place.id);
  db.prepare(`UPDATE places SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  const updated = db.prepare('SELECT * FROM places WHERE id = ?').get(place.id);
  res.json({ place: withRatingStats(updated) });
}

// DELETE /api/places/:id  (المورد صاحب المكان فقط)
function remove(req, res) {
  const place = db.prepare('SELECT * FROM places WHERE id = ?').get(req.params.id);
  if (!place) return res.status(404).json({ error: 'المكان غير موجود' });
  if (place.vendor_id !== req.user.id) {
    return res.status(403).json({ error: 'لا يمكنك حذف مكان لا تملكه' });
  }
  db.prepare('DELETE FROM places WHERE id = ?').run(place.id);
  res.json({ success: true });
}

module.exports = { list, getOne, create, update, remove, withRatingStats };
