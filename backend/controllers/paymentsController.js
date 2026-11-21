const { getStripe } = require('../utils/stripe');
const { payFullyWithWallet, createStripeCheckout, createMixedPaymentIntent, finalizeStripePayment } = require('../services/paymentService');
const Registration = require('../models/registrationModel');
const { resendReceipt } = require('../utils/paymentReceipt');
const { transporter } = require('../utils/mailer');
const { resendRegistrationConfirmation } = require('../utils/registrationConfirmation');

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// Health / configuration insight
exports.health = async (req, res) => {
  const secret = process.env.STRIPE_SECRET_KEY || '';
  const secretPresent = secret.startsWith('sk_');
  let apiReachable = false;
  let error = null;
  if (secretPresent) {
    try {
      const stripe = getStripe();
      // lightweight ping: list 1 payment intent (will be empty in fresh test accounts)
      await stripe.paymentIntents.list({ limit: 1 });
      apiReachable = true;
    } catch (e) {
      error = e.message;
    }
  }
  return res.json({
    secretPresent,
    apiReachable,
    hasWebhookSecret: !!process.env.STRIPE_WEBHOOK_SECRET,
    error: error ? error.replace(/\b(?:sk|pk)_(?:live|test)[A-Za-z0-9_]+\b/g, '***masked***') : null
  });
};

exports.createCheckoutSession = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId } = req.body || {};
    if (!registrationId) return res.status(400).json({ error: 'registrationId is required' });
    const data = await createStripeCheckout({ registrationId, userId, frontendUrl: FRONTEND_URL });
    return res.json(data);
  } catch (e) { next(e); }
};

exports.payWithWallet = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId } = req.body || {};
    if (!registrationId) return res.status(400).json({ error: 'registrationId is required' });
    const { reg, user } = await payFullyWithWallet({ registrationId, userId });
    return res.json({ ok: true, registration: reg, walletBalance: user.walletBalance });
  } catch (e) { next(e); }
};

exports.createMixedIntent = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId, walletAmount } = req.body || {};
    if (!registrationId) return res.status(400).json({ error: 'registrationId is required' });
    const data = await createMixedPaymentIntent({ registrationId, userId, walletUseAmount: walletAmount });
    return res.json(data);
  } catch (e) { next(e); }
};

// Stripe webhook (raw body parsed in route setup)
exports.webhook = async (req, res) => {
  const stripe = getStripe();
  if (!stripe) return res.status(503).json({ error: 'Stripe not configured' });
  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const registrationId = session.metadata?.registrationId;
    if (registrationId) {
      const reg = await Registration.findById(registrationId).populate('event');
      if (reg && reg.paymentStatus !== 'PAID') {
        reg.stripePaymentIntentId = session.payment_intent;
        await finalizeStripePayment({ paymentIntentId: session.payment_intent, success: true });
      }
    }
  } else if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object;
    await finalizeStripePayment({ paymentIntentId: intent.id, success: true });
  } else if (event.type === 'payment_intent.payment_failed') {
    const intent = event.data.object;
    await finalizeStripePayment({ paymentIntentId: intent.id, success: false });
  }
  return res.json({ received: true });
};

// Helper to query payment status (for frontend polling after mixed intent)
exports.getPaymentStatus = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId } = req.query || {};
    if (!registrationId) return res.status(400).json({ error: 'registrationId is required' });
    const reg = await Registration.findById(registrationId);
    if (!reg) return res.status(404).json({ error: 'Not found' });
    if (String(reg.user) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    return res.json({ paymentStatus: reg.paymentStatus, paymentMethod: reg.paymentMethod, amountPaid: reg.amountPaid, walletDeducted: reg.walletDeducted });
  } catch (e) { next(e); }
};

// Resend receipt (only if already paid). Allows user to trigger if missed.
exports.resendReceipt = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId } = req.params;
    if (!registrationId) return res.status(400).json({ error: 'registrationId is required' });
    const reg = await Registration.findById(registrationId);
    if (!reg) return res.status(404).json({ error: 'Not found' });
    if (String(reg.user) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    if (reg.paymentStatus !== 'PAID') return res.status(400).json({ error: 'Payment not completed; cannot send receipt yet' });
    await resendReceipt(reg._id);
    return res.json({ ok: true, queued: true });
  } catch (e) { next(e); }
};

// Send a test email (diagnostic) to authenticated user's email.
exports.sendTestEmail = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const user = await require('../models/userModel').findById(userId);
    if (!user || !user.email) return res.status(400).json({ error: 'User email missing' });
    await transporter.sendMail({
      to: user.email,
      from: process.env.MAIL_FROM || process.env.SMTP_USER,
      subject: 'Agora Test Email',
      text: 'This is a test email confirming SMTP configuration works.',
    });
    return res.json({ ok: true });
  } catch (e) { next(e); }
};

// Debug receipt info for a registration
exports.getReceiptDebug = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId } = req.params;
    const reg = await Registration.findById(registrationId);
    if (!reg) return res.status(404).json({ error: 'Not found' });
    if (String(reg.user) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    return res.json({
      paymentStatus: reg.paymentStatus,
      paymentMethod: reg.paymentMethod,
      amountPaid: reg.amountPaid,
      walletDeducted: reg.walletDeducted,
      receiptSentAt: reg.receiptSentAt,
      lastReceiptError: reg.lastReceiptError,
      confirmationSentAt: reg.confirmationSentAt,
      lastConfirmationError: reg.lastConfirmationError,
    });
  } catch (e) { next(e); }
};

// Resend registration confirmation
exports.resendRegistrationConfirmation = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId } = req.params;
    const reg = await Registration.findById(registrationId);
    if (!reg) return res.status(404).json({ error: 'Not found' });
    if (String(reg.user) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    await resendRegistrationConfirmation(reg._id);
    return res.json({ ok: true, queued: true });
  } catch (e) { next(e); }
};

// Manual finalize: mark a STRIPE/MIXED registration as PAID immediately after client confirmation,
// bypassing reliance on webhook delivery. Use only if you trust the client confirmation result.
exports.manualFinalize = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    const { registrationId } = req.body || {};
    if (!registrationId) return res.status(400).json({ error: 'registrationId is required' });
    const reg = await Registration.findById(registrationId).populate('event');
    if (!reg) return res.status(404).json({ error: 'Not found' });
    if (String(reg.user) !== String(userId)) return res.status(403).json({ error: 'Forbidden' });
    if (reg.paymentStatus === 'PAID') return res.json({ ok: true, already: true });
    if (!['STRIPE','MIXED'].includes(reg.paymentMethod)) return res.status(400).json({ error: 'Not a card payment registration' });
    const paymentIntentId = reg.mixedPaymentIntentId || reg.stripePaymentIntentId;
    if (!paymentIntentId) return res.status(400).json({ error: 'No payment intent id present' });
    await finalizeStripePayment({ paymentIntentId, success: true });
    const refreshed = await Registration.findById(reg._id);
    return res.json({ ok: true, registration: refreshed });
  } catch (e) { next(e); }
};