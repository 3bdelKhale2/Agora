const Registration = require('../models/registrationModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const WalletTransaction = require('../models/walletTransactionModel');
const { queueCancellationEmail } = require('../utils/cancellationEmail');

const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

async function cancelRegistrationWithRefund({ registrationId, userId }) {
  const reg = await Registration.findById(registrationId).populate('event');
  if (!reg) throw Object.assign(new Error('Registration not found'), { status: 404 });
  if (String(reg.user) !== String(userId)) throw Object.assign(new Error('Forbidden'), { status: 403 });
  if (reg.status === 'CANCELLED') return { reg, refundApplied: false, reason: 'Already cancelled' };
  const event = reg.event;
  if (!event) throw new Error('Event not found');
  if (!event.startAt) throw new Error('Event has no start date');
  const now = Date.now();
  const startMs = new Date(event.startAt).getTime();
  const remaining = startMs - now;
  if (remaining < FOURTEEN_DAYS_MS) {
    throw Object.assign(new Error('Cancellation period expired'), { status: 400 });
  }
  // Only workshops/trips allowed (business rule) but controller already filters; double-check
  if (!['WORKSHOP','TRIP'].includes(event.type)) {
    throw Object.assign(new Error('Cancellation not allowed for this event type'), { status: 400 });
  }
  // Compute payable price once (used for unconditional refund policy)
  let eventPrice = 0;
  if (event.type === 'TRIP') eventPrice = event.tripDetails?.price ?? 0;
  else if (event.type === 'WORKSHOP') eventPrice = event.workshopDetails?.price ?? event.price ?? 0;
  // Unconditional refund policy: if there is a price > 0 and registration not already refunded, credit user.
  // Avoid double refunds by checking paymentStatus !== 'REFUNDED'.
  let refundAmount = 0;
  if (eventPrice > 0 && reg.paymentStatus !== 'REFUNDED') {
    refundAmount = reg.amountPaid || reg.priceSnapshot || eventPrice;
  }
  console.log('[cancel] computed refund', {
    registrationId: reg._id.toString(),
    userId: userId.toString(),
    currentStatus: reg.status,
    paymentStatus: reg.paymentStatus,
    eventType: event.type,
    eventPrice,
    amountPaid: reg.amountPaid,
    priceSnapshot: reg.priceSnapshot,
    refundAmount
  });
  reg.status = 'CANCELLED';
  reg.cancelledAt = new Date();
  // Mark payment status as REFUNDED when we apply the wallet credit
  if (refundAmount > 0) {
    reg.paymentStatus = 'REFUNDED';
  }
  await reg.save();
  console.log('[cancel] after save', { registrationId: reg._id.toString(), paymentStatus: reg.paymentStatus, refundAmount });
  let walletBalanceAfter = null;
  if (refundAmount > 0) {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      { $inc: { walletBalance: refundAmount } },
      { new: true }
    );
    if (!user) {
      // Rare: user missing or update failed. Log error; do not revert cancellation.
      console.error('[cancel] wallet refund failed for user', userId, 'amount', refundAmount);
    } else {
      walletBalanceAfter = user.walletBalance;
      await WalletTransaction.create({
        user: user._id,
        type: 'REFUND',
        amount: refundAmount,
        currency: 'usd',
        relatedRegistration: reg._id,
        balanceAfter: user.walletBalance,
        meta: { eventId: event._id, title: event.title }
      });
      console.log('[cancel] wallet credited', { userId: user._id.toString(), walletBalanceAfter, refundAmount });
    }
  } else {
    console.log('[cancel] no refund applied', { registrationId: reg._id.toString(), paymentStatus: reg.paymentStatus });
  }
  queueCancellationEmail(reg, refundAmount);
  return { reg, refundApplied: refundAmount > 0, refundAmount, walletBalanceAfter };
}

module.exports = { cancelRegistrationWithRefund };