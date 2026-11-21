const express = require('express');
const ctrl = require('../controllers/courtsController');

const router = express.Router();

// Public: list courts and availability (students view)
router.get('/', ctrl.listCourts);
router.get('/availability', ctrl.listAllAvailability); // ?sport=&from=&to=
router.get('/:id/slots', ctrl.listCourtSlots); // ?from=ISO&to=ISO

module.exports = router;