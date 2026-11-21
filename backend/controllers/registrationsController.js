const mongoose = require('mongoose');
const Registration = require('../models/registrationModel');
const Event = require('../models/eventModel');
const User = require('../models/userModel');
const { queueRegistrationConfirmation } = require('../utils/registrationConfirmation');
const { payFullyWithWallet } = require('../services/paymentService');
const { cancelRegistrationWithRefund } = require('../services/cancellationService');

exports.listMyRegistrations = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { upcoming, past, page = '1', limit = '20' } = req.query || {};
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = { user: userId };
    if (upcoming === '1' || upcoming === 'true') {
      // Include both REGISTERED and PENDING so user sees unpaid registrations
      filter.status = { $in: ['REGISTERED','PENDING'] };
    }
    if (past === '1' || past === 'true') {
      // no extra filter; we will filter by event date after populate if needed
    }

    const regs = await Registration.find(filter)
      .sort({ createdAt: -1 })
      .skip((p - 1) * l)
      .limit(l)
      .populate('event')
      .lean();

    const now = new Date();
    let data = regs;
    if (upcoming === '1' || upcoming === 'true') {
      data = regs.filter(r => r.event && new Date(r.event.startAt) >= now);
    } else if (past === '1' || past === 'true') {
      data = regs.filter(r => r.event && new Date(r.event.startAt) < now);
    }

    const total = await Registration.countDocuments({ user: userId });
    return res.json({
      data,
      meta: { page: p, limit: l, total, pages: Math.ceil(total / l) || 1 }
    });
  } catch (e) { next(e); }
};

exports.registerToEvent = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { event: eventId } = req.body || {};
    if (!mongoose.isValidObjectId(eventId)) {
      return res.status(400).json({ error: 'Invalid event id' });
    }

    const ev = await Event.findById(eventId);
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    // Only workshops and trips are registrable
    if (!['WORKSHOP', 'TRIP'].includes(ev.type)) {
      return res.status(400).json({ error: 'Registration is only available for workshops and trips' });
    }

    // Only allow active/published events
    if (ev.status !== 'PUBLISHED') {
      return res.status(400).json({ error: 'Registration is not open for this event' });
    }
    if (ev.registrationDeadline) {
      const deadline = new Date(ev.registrationDeadline);
      if (new Date() > deadline) {
        return res.status(400).json({ error: 'Registration deadline has passed' });
      }
    }

    // Capacity check counts only fully registered attendees
    if (typeof ev.capacity === 'number' && ev.capacity > 0) {
      const count = await Registration.countDocuments({ event: ev._id, status: 'REGISTERED' });
      if (count >= ev.capacity) {
        return res.status(400).json({ error: 'Event is at full capacity' });
      }
    }

    // Load user snapshot
    const user = await User.findById(userId);
    if (!user) return res.status(401).json({ error: 'Unauthorized' });

    // If a registration exists but is unpaid/pending, reuse it instead of erroring
    let existing = await Registration.findOne({ event: ev._id, user: user._id });
    const price = ev.type === 'TRIP' ? (ev.tripDetails?.price ?? 0) : (ev.type === 'WORKSHOP' ? (ev.workshopDetails?.price ?? ev.price ?? 0) : 0);

    const forceWallet = !!req.body?.forceWallet; // opt-in flag to allow immediate wallet auto-payment
    if (existing) {
      // Allow re-registration if previously CANCELLED (even if payment was refunded).
      if (existing.status === 'CANCELLED') {
        existing.status = 'PENDING';
        existing.paymentStatus = price > 0 ? 'UNPAID' : 'PAID';
        if (existing.paymentStatus === 'PAID') {
          existing.amountPaid = 0;
        }
        // Clear previous payment linkage fields
        existing.stripeCheckoutSessionId = undefined;
        existing.stripePaymentIntentId = undefined;
        existing.mixedPaymentIntentId = undefined;
        existing.paymentMethod = undefined;
        existing.walletDeducted = undefined;
        existing.amountPaid = undefined;
        existing.priceSnapshot = price > 0 ? price : 0;
        existing.snapshot = {
          name: user.fullName,
          email: user.email,
          gucId: user.gucId || null,
        };
        await existing.save();
        // No auto wallet payment for cancelled re-registrations - force payment dialog
        queueRegistrationConfirmation(existing);
        return res.status(200).json(existing);
      }
      if (existing.paymentStatus === 'PAID' || existing.status === 'REGISTERED') {
        return res.status(400).json({ error: 'Already registered for this event' });
      }
      existing.status = 'PENDING';
      existing.snapshot = {
        name: user.fullName,
        email: user.email,
        gucId: user.gucId || null,
      };
      await existing.save();
      // Auto wallet payment only if explicitly forced
      if (forceWallet && price > 0 && (user.walletBalance || 0) >= price) {
        try {
          const { reg: paidReg } = await payFullyWithWallet({ registrationId: existing._id, userId: user._id });
          return res.status(200).json(paidReg);
        } catch (err) {
          // fall through to confirmation
        }
      }
      queueRegistrationConfirmation(existing);
      return res.status(200).json(existing);
    }

    let reg = await Registration.create({
      event: ev._id,
      user: user._id,
      status: 'PENDING',
      priceSnapshot: price > 0 ? price : 0,
      snapshot: {
        name: user.fullName,
        email: user.email,
        gucId: user.gucId || null,
      }
    });

    // Auto wallet payment only if explicitly forced
    if (forceWallet && price > 0 && (user.walletBalance || 0) >= price) {
      try {
        const result = await payFullyWithWallet({ registrationId: reg._id, userId: user._id });
        reg = result.reg;
        return res.status(201).json(reg);
      } catch (err) {
        // fallback to confirmation
      }
    }

    queueRegistrationConfirmation(reg);
    return res.status(201).json(reg);
  } catch (e) {
    if (e && e.code === 11000) {
      return res.status(400).json({ error: 'Already registered for this event' });
    }
    next(e);
  }
};

exports.cancelRegistration = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { id } = req.params || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid registration id' });
    const { reg, refundApplied, refundAmount, walletBalanceAfter } = await cancelRegistrationWithRefund({ registrationId: id, userId });
    return res.json({ registration: reg, refundApplied, refundAmount, walletBalanceAfter });
  } catch (e) { next(e); }
};