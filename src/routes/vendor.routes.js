const express = require('express');
const vendorController = require('../controllers/vendor.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('vendor'));

router.get('/places', vendorController.myPlaces);
router.get('/stats', vendorController.stats);
router.put('/plan', vendorController.updatePlan);

module.exports = router;
