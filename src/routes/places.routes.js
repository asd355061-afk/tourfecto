const express = require('express');
const placesController = require('../controllers/places.controller');
const reviewsController = require('../controllers/reviews.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

// عام - لا يتطلب تسجيل دخول
router.get('/', placesController.list);
router.get('/:id', placesController.getOne);
router.get('/:id/reviews', reviewsController.listByPlace);

// يتطلب تسجيل دخول (أي مستخدم) لإضافة تقييم
router.post('/:id/reviews', requireAuth, reviewsController.create);

// المورد فقط
router.post('/', requireAuth, requireRole('vendor'), placesController.create);
router.put('/:id', requireAuth, requireRole('vendor'), placesController.update);
router.delete('/:id', requireAuth, requireRole('vendor'), placesController.remove);

module.exports = router;
