const db = require('../db');
const { withRatingStats } = require('./places.controller');

// GET /api/vendor/places  (المورد صاحب الحساب فقط)
function myPlaces(req, res) {
  const places = db
    .prepare('SELECT * FROM places WHERE vendor_id = ? ORDER BY created_at DESC')
    .all(req.user.id)
    .map(withRatingStats);
  res.json({ places });
}

// GET /api/vendor/stats  (إحصائيات حقيقية من قاعدة البيانات)
function stats(req, res) {
  const places = db.prepare('SELECT id FROM places WHERE vendor_id = ?').all(req.user.id);
  const placeIds = places.map((p) => p.id);

  if (!placeIds.length) {
    return res.json({
      totalViews: 0,
      totalReviews: 0,
      averageRating: 0,
      placesCount: 0,
      viewsLast7Days: [0, 0, 0, 0, 0, 0, 0],
    });
  }

  const placeholders = placeIds.map(() => '?').join(',');

  const totalViews = db
    .prepare(`SELECT COUNT(*) AS c FROM place_views WHERE place_id IN (${placeholders})`)
    .get(...placeIds).c;

  const reviewStats = db
    .prepare(
      `SELECT COUNT(*) AS c, AVG(rating) AS avg FROM reviews WHERE place_id IN (${placeholders})`
    )
    .get(...placeIds);

  // عدد المشاهدات لكل يوم في آخر 7 أيام
  const viewsLast7Days = db
    .prepare(
      `SELECT date(viewed_at) AS day, COUNT(*) AS c
       FROM place_views
       WHERE place_id IN (${placeholders}) AND viewed_at >= date('now', '-6 days')
       GROUP BY day ORDER BY day ASC`
    )
    .all(...placeIds);

  res.json({
    totalViews,
    totalReviews: reviewStats.c || 0,
    averageRating: reviewStats.avg ? Math.round(reviewStats.avg * 10) / 10 : 0,
    placesCount: placeIds.length,
    viewsLast7Days,
  });
}

// PUT /api/vendor/plan  (تغيير خطة الاشتراك)
function updatePlan(req, res) {
  const { plan } = req.body;
  if (!['basic', 'pro', 'premium'].includes(plan)) {
    return res.status(400).json({ error: 'خطة غير صحيحة' });
  }
  db.prepare('UPDATE vendor_profiles SET plan = ? WHERE user_id = ?').run(plan, req.user.id);
  res.json({ success: true, plan });
}

module.exports = { myPlaces, stats, updatePlan };
