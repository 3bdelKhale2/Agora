const Registration = require('../models/registrationModel');
const User = require('../models/userModel');
const Event = require('../models/eventModel');
const WalletTransaction = require('../models/walletTransactionModel');
const PaymentAttempt = require('../models/paymentAttemptModel');
const { getStripe } = require('../utils/stripe');
const { queuePaymentReceipt } = require('../utils/paymentReceipt');

function extractPrice(ev) {
  if (!ev) return null;
  if (ev.type === 'TRIP') return ev.tripDetails?.price ?? null;
  if (ev.type === 'WORKSHOP') return ev.workshopDetails?.price ?? ev.price ?? null;
  return null;
}

async function getPayableRegistration(registrationId, userId) {
  const reg = await Registration.findById(registrationId).populate('event');
  if (!reg) throw new Error('Registration not found');
  if (String(reg.user) !== String(userId)) throw new Error('Forbidden');
  if (reg.paymentStatus === 'PAID') throw new Error('Already paid');
  const price = reg.priceSnapshot != null ? reg.priceSnapshot : extractPrice(reg.event);
  if (price == null) throw new Error('Event is not payable');
  return { reg, price };
}

async function payFullyWithWallet({ registrationId, userId }) {
  const { reg, price } = await getPayableRegistration(registrationId, userId);
  const user = await User.findOneAndUpdate(
    { _id: userId, walletBalance: { $gte: price } },
    { $inc: { walletBalance: -price } },
    { new: true }
  );
  if (!user) throw new Error('Insufficient wallet balance');
  reg.paymentStatus = 'PAID';
  reg.status = 'REGISTERED';
  reg.paymentMethod = 'WALLET';
  reg.amountPaid = price;
  reg.currency = 'usd';
  reg.priceSnapshot = price;
  reg.walletDeducted = price;
  await reg.save();
  await WalletTransaction.create({
    user: user._id,
    type: 'PURCHASE',
    amount: price,
    currency: 'usd',
    relatedRegistration: reg._id,
    balanceAfter: user.walletBalance,
    meta: { eventId: reg.event._id, title: reg.event.title }
  });
  const attempt = await PaymentAttempt.create({
    registration: reg._id,
    user: user._id,
    method: 'WALLET',
    walletAmount: price,
    stripeAmount: 0,
    status: 'SUCCEEDED'
  });
  reg.paymentAttempts.push(attempt._id);
  await reg.save();
  console.log('[payment] wallet payment succeeded; queueing receipt for registration', reg._id.toString());
  queuePaymentReceipt(reg);
  return { reg, user };
}

async function createStripeCheckout({ registrationId, userId, frontendUrl }) {
  const { reg, price } = await getPayableRegistration(registrationId, userId);
  const stripe = getStripe();
  if (!stripe) throw new Error('Stripe not configured');
  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    payment_method_types: ['card'],
    success_url: `${frontendUrl}/registrations?paid=1`,
    cancel_url: `${frontendUrl}/registrations?canceled=1`,
    line_items: [
      {
        price_data: {
          currency: 'usd',
          product_data: { name: reg.event.title },
          unit_amount: Math.round(price * 100),
        },
        quantity: 1,
      },
    ],
    metadata: { registrationId: reg._id.toString(), userId: userId.toString() },
  });
  reg.paymentStatus = 'PENDING';
  reg.status = 'PENDING';
  reg.paymentMethod = 'STRIPE';
  reg.priceSnapshot = price;
  reg.stripeCheckoutSessionId = session.id;
  await reg.save();
  const attempt = await PaymentAttempt.create({
    registration: reg._id,
    user: userId,
    method: 'STRIPE',
    walletAmount: 0,
    stripeAmount: price,
    status: 'INITIATED',
    stripePaymentIntentId: session.payment_intent || undefined
  });
  reg.paymentAttempts.push(attempt._id);
  await reg.save();
  return { sessionId: session.id };
}

async function createMixedPaymentIntent({ registrationId, userId, walletUseAmount = 0 }) {
  const { reg, price } = await getPayableRegistration(registrationId, userId);
  const user = await User.findById(userId);
  if (!user) throw new Error('User not found');
  const availableWallet = user.walletBalance || 0;
  const walletAmount = Math.min(Math.max(walletUseAmount, 0), availableWallet, price);
  let remaining = price - walletAmount;
  const stripe = getStripe();
  if (walletAmount > 0) {
    // atomic decrement
    const updated = await User.findOneAndUpdate(
      { _id: userId, walletBalance: { $gte: walletAmount } },
      { $inc: { walletBalance: -walletAmount } },
      { new: true }
    );
    if (!updated) throw new Error('Insufficient wallet balance for requested amount');
    user.walletBalance = updated.walletBalance;
    await WalletTransaction.create({
      user: user._id,
      type: 'PURCHASE',
      amount: walletAmount,
      currency: 'usd',
      relatedRegistration: reg._id,
      balanceAfter: user.walletBalance,
      meta: { partial: true, eventId: reg.event._id }
    });
  }
  if (remaining <= 0) {
    // Fully covered by wallet partial (or full)
    reg.paymentStatus = 'PAID';
    reg.status = 'REGISTERED';
    reg.paymentMethod = walletAmount === price ? 'WALLET' : 'MIXED';
    reg.amountPaid = price;
    reg.walletDeducted = walletAmount;
    reg.priceSnapshot = price;
    await reg.save();
    const attempt = await PaymentAttempt.create({
      registration: reg._id,
      user: user._id,
      method: walletAmount === price ? 'WALLET' : 'MIXED',
      walletAmount,
      stripeAmount: 0,
      status: 'SUCCEEDED'
    });
    reg.paymentAttempts.push(attempt._id);
    await reg.save();
    console.log('[payment] mixed/wallet full coverage; queueing receipt', reg._id.toString());
    queuePaymentReceipt(reg);
    return { paid: true, remaining: 0, registration: reg, walletBalance: user.walletBalance };
  }
  if (!stripe) throw new Error('Stripe not configured');
  const intent = await stripe.paymentIntents.create({
    amount: Math.round(remaining * 100),
    currency: 'usd',
    metadata: { registrationId: reg._id.toString(), userId: userId.toString(), walletDeducted: walletAmount.toString() },
    automatic_payment_methods: { enabled: true },
  });
  reg.paymentStatus = 'PENDING';
  reg.status = 'PENDING';
  reg.paymentMethod = walletAmount > 0 ? 'MIXED' : 'STRIPE';
  reg.priceSnapshot = price;
  reg.walletDeducted = walletAmount > 0 ? walletAmount : undefined;
  reg.mixedPaymentIntentId = intent.id;
  await reg.save();
  const attempt = await PaymentAttempt.create({
    registration: reg._id,
    user: user._id,
    method: walletAmount > 0 ? 'MIXED' : 'STRIPE',
    walletAmount,
    stripeAmount: remaining,
    status: 'INITIATED',
    stripePaymentIntentId: intent.id
  });
  reg.paymentAttempts.push(attempt._id);
  await reg.save();
  return { paid: false, clientSecret: intent.client_secret, remaining, walletDeducted: walletAmount, walletBalance: user.walletBalance };
}

async function finalizeStripePayment({ paymentIntentId, success }) {
  const reg = await Registration.findOne({ $or: [ { stripePaymentIntentId: paymentIntentId }, { mixedPaymentIntentId: paymentIntentId } ] }).populate('event');
  if (!reg) return { updated: false };
  const attempt = await PaymentAttempt.findOne({ stripePaymentIntentId: paymentIntentId }).sort({ createdAt: -1 });
  if (success) {
    const price = reg.priceSnapshot != null ? reg.priceSnapshot : extractPrice(reg.event);
    reg.paymentStatus = 'PAID';
    reg.status = 'REGISTERED';
    reg.amountPaid = price;
    if (!reg.walletDeducted) reg.walletDeducted = 0;
    await reg.save();
    if (attempt) { attempt.status = 'SUCCEEDED'; await attempt.save(); }
    console.log('[payment] stripe payment finalized success; queueing receipt', reg._id.toString());
    queuePaymentReceipt(reg);
    return { updated: true };
  }
  reg.paymentStatus = 'FAILED';
  // Keep as PENDING for possible retry; do not block capacity
  if (reg.status !== 'REGISTERED') reg.status = 'PENDING';
  await reg.save();
  if (attempt) { attempt.status = 'FAILED'; await attempt.save(); }
  return { updated: true };
}

module.exports = {
  payFullyWithWallet,
  createStripeCheckout,
  createMixedPaymentIntent,
  finalizeStripePayment,
};