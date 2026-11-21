const express = require('express');
const ctrl = require('../controllers/vendorParticipationsController');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Vendor: view own requests
router.get('/', requireAuth, requireRoles('VENDOR'), ctrl.listMyRequests);

// Admin/EO: list all requests with filters
router.get('/all', requireAuth, requireRoles('ADMIN', 'EVENTS_OFFICE'), ctrl.listAllRequests);

// Vendor: apply to a bazaar (requires event id in body)
router.post('/bazaar', requireAuth, requireRoles('VENDOR'), ctrl.applyToBazaar);

// Vendor: apply for platform booth setup
router.post('/booth-setup', requireAuth, requireRoles('VENDOR'), ctrl.applyForBoothSetup);

// Admin/EO: view and decide
router.get('/:id', requireAuth, requireRoles('ADMIN', 'EVENTS_OFFICE'), ctrl.getRequestById);
router.patch('/:id/accept', requireAuth, requireRoles('ADMIN', 'EVENTS_OFFICE'), ctrl.acceptRequest);
router.patch('/:id/reject', requireAuth, requireRoles('ADMIN', 'EVENTS_OFFICE'), ctrl.rejectRequest);

module.exports = router;