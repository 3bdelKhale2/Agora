const express = require('express');
const ctrl = require('../controllers/registrationsController');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, ctrl.listMyRegistrations); // upcoming/past by query
router.post('/', requireAuth, requireRoles('STUDENT','STAFF','TA','PROFESSOR'), ctrl.registerToEvent);
router.delete('/:id', requireAuth, ctrl.cancelRegistration);

module.exports = router;