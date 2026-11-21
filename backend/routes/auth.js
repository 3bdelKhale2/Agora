const express = require('express');
const ctrl = require('../controllers/authController');

const router = express.Router();

// Public
router.post('/signup', ctrl.signup); // Students/Staff/TA/Professor/Vendor (Admins/EO are created by admin)
router.post('/login', ctrl.login);
router.post('/logout', ctrl.logout);
router.get('/verify-email', ctrl.verifyEmail); // ?token=...
router.get('/verify-role', ctrl.verifyRole);   // ?token=...

// Forgot/reset password
router.post('/forgot-password', ctrl.forgotPassword);
router.post('/reset-password', ctrl.resetPassword);

module.exports = router;