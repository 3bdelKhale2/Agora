const express = require('express');
const router = express.Router();
const gymSessionsController = require('../controllers/gymSessionsController');

// GET /api/gym-sessions?month=YYYY-MM
router.get('/', gymSessionsController.getGymSessionsByMonth);

module.exports = router;
