const express = require('express');
const router = express.Router();
const paymentsCtrl = require('../controllers/paymentsController');
const { requireAuth } = require('../middleware/auth');
const bodyParser = require('body-parser');

// Checkout session (Stripe)
router.post('/checkout', requireAuth, paymentsCtrl.createCheckoutSession);
// Wallet payment
router.post('/wallet', requireAuth, paymentsCtrl.payWithWallet);
// Mixed (partial wallet + card) payment intent
router.post('/mixed-intent', requireAuth, paymentsCtrl.createMixedIntent);
// Manual finalize after client-side confirmation (bypasses webhook)
router.post('/manual-finalize', requireAuth, paymentsCtrl.manualFinalize);
// Poll payment status
router.get('/status', requireAuth, paymentsCtrl.getPaymentStatus);
// Resend receipt
router.post('/receipt/resend/:registrationId', requireAuth, paymentsCtrl.resendReceipt);
// Test email
router.post('/test-email', requireAuth, paymentsCtrl.sendTestEmail);
// Receipt debug
router.get('/receipt/debug/:registrationId', requireAuth, paymentsCtrl.getReceiptDebug);
router.post('/confirmation/resend/:registrationId', requireAuth, paymentsCtrl.resendRegistrationConfirmation);
// Health (no auth needed - safe, does not leak keys)
router.get('/health', paymentsCtrl.health);
// Stripe webhook (raw body)
router.post('/webhook', bodyParser.raw({ type: 'application/json' }), paymentsCtrl.webhook);

module.exports = router;