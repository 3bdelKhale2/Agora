const express = require('express');
const ctrl = require('../controllers/eventsController');
const { requireAuth, requireRole, parseAuthOptional } = require('../middleware/auth');

const router = express.Router();

// Discovery (token optional so owners/EO/Admin can see non-PUBLISHED)
router.get('/', parseAuthOptional, ctrl.listEvents);
// List only unregistered events for admin deletion
router.get('/unregistered', requireAuth, requireRole('ADMIN'), ctrl.listUnregisteredEvents);
router.get('/:id', parseAuthOptional, ctrl.getEventById);

// Create by type
router.post('/workshops', requireAuth, requireRole('PROFESSOR'), ctrl.createWorkshop);
router.post('/trips', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.createTrip);
router.post('/bazaars', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.createBazaar);
router.post('/conferences', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.createConference);
router.post('/gym-sessions', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.createGymSession);
router.post('/booths', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.createBoothSetup); // added

// Edit generic (type-specific rules handled inside)
router.patch('/:id', requireAuth, ctrl.updateEvent);

// Review lifecycle (EO)
router.patch('/:id/publish', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.publishEvent);
router.patch('/:id/reject', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.rejectEvent);
router.patch('/:id/request-edits', requireAuth, requireRole('EVENTS_OFFICE'), ctrl.requestEdits);
router.patch('/:id/accept-edits', requireAuth, requireRole('PROFESSOR'), ctrl.acceptProposedEdits);
router.patch('/:id/reject-edits', requireAuth, requireRole('PROFESSOR'), ctrl.rejectProposedEdits);
router.patch('/:id/cancel', requireAuth, requireRole('EVENTS_OFFICE', 'ADMIN'), ctrl.cancelEvent);

// Delete if no registrations
router.delete('/:id', requireAuth, requireRole('EVENTS_OFFICE', 'ADMIN'), ctrl.deleteEventIfNoRegistrations);

module.exports = router;
