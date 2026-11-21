const express = require('express');
const ctrl = require('../controllers/usersController');
const { requireAuth, requireRoles } = require('../middleware/auth');

const router = express.Router();

// Get current user profile
router.get('/me', requireAuth, ctrl.getMe);

// Admin list users
router.get('/', requireAuth, requireRoles('ADMIN'), ctrl.listUsers);

// Admin creates Admin/EO accounts
router.post('/admins', requireAuth, requireRoles('ADMIN'), ctrl.createAdminOrEO);

// Admin deletes Admin/EO account
router.delete('/:id', requireAuth, requireRoles('ADMIN'), ctrl.deleteAdminOrEO);

// Admin assigns roles and triggers verification email
router.patch('/:id/roles', requireAuth, requireRoles('ADMIN'), ctrl.assignRoles);
router.post('/:id/trigger-role-verification', requireAuth, requireRoles('ADMIN'), ctrl.triggerRoleVerification);

// Admin: accept/reject verification approval
router.patch('/:id/verify-approval', requireAuth, requireRoles('ADMIN'), ctrl.verifyUserApproval);

// Admin: verify email shortcut (no email sent)
router.patch('/:id/verify-email-shortcut', requireAuth, requireRoles('ADMIN'), ctrl.verifyEmailShortcut);

module.exports = router;