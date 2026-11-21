const express = require('express');
const ctrl = require('../controllers/vendorProfilesController');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Vendor manages their profile
router.get('/me', requireAuth, requireRoles('VENDOR'), ctrl.getMyVendorProfile);
router.put('/me', requireAuth, requireRoles('VENDOR'), ctrl.upsertMyVendorProfile);

module.exports = router;