const mongoose = require('mongoose');
const VendorParticipation = require('../models/vendorParticipationModel');
const VendorProfile = require('../models/vendorProfileModel');
const Event = require('../models/eventModel');

async function getVendorProfileId(userId) {
  const vp = await VendorProfile.findOne({ user: userId }).select('_id').lean();
  return vp?._id;
}

function validateAttendees(attendees) {
  if (!Array.isArray(attendees) || attendees.length === 0 || attendees.length > 5) {
    return 'Attendees must be 1 to 5';
  }
  for (const a of attendees) {
    if (!a?.name || !a?.email || typeof a.email !== 'string' || !a.email.includes('@')) {
      return 'Each attendee requires valid name and email';
    }
  }
  return null;
}

exports.listMyRequests = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const vendorProfile = await getVendorProfileId(userId);
    if (!vendorProfile) return res.status(404).json({ error: 'Vendor profile not found' });

    const { status, upcomingOnly } = req.query || {};
    const filter = { vendorProfile };
    if (status && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(String(status).toUpperCase())) {
      filter.status = String(status).toUpperCase();
    }

    let q = VendorParticipation.find(filter).populate('event').sort({ createdAt: -1 }).lean();
    let data = await q.exec();

    if ((upcomingOnly === '1' || upcomingOnly === 'true')) {
      const now = new Date();
      data = data.filter((r) => !r.event || new Date(r.event.startAt) >= now);
    }

    return res.json(data);
  } catch (e) { next(e); }
};

exports.applyToBazaar = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const vendorProfile = await getVendorProfileId(userId);
    if (!vendorProfile) return res.status(404).json({ error: 'Vendor profile not found' });

    const { event: eventId, boothSize, attendees } = req.body || {};
    if (!mongoose.isValidObjectId(eventId)) return res.status(400).json({ error: 'Invalid event id' });
    if (!['2x2', '4x4'].includes(boothSize)) return res.status(400).json({ error: 'Invalid booth size' });
    const attErr = validateAttendees(attendees);
    if (attErr) return res.status(400).json({ error: attErr });

    const ev = await Event.findById(eventId);
    if (!ev || ev.type !== 'BAZAAR') return res.status(400).json({ error: 'Event must be a BAZAAR' });
    if (ev.bazaarDetails?.allowsVendors === false) {
      return res.status(400).json({ error: 'Bazaar does not accept vendors' });
    }

    // Prevent duplicate active requests for same bazaar
    const exists = await VendorParticipation.findOne({
      vendorProfile,
      kind: 'BAZAAR',
      event: ev._id,
      status: { $in: ['PENDING', 'ACCEPTED'] },
    }).lean();
    if (exists) return res.status(400).json({ error: 'Request already exists for this bazaar' });

    const created = await VendorParticipation.create({
      kind: 'BAZAAR',
      vendorProfile,
      event: ev._id,
      attendees,
      boothSize,
      status: 'PENDING',
    });

    return res.status(201).json(created);
  } catch (e) { next(e); }
};

exports.applyForBoothSetup = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    const vendorProfile = await getVendorProfileId(userId);
    if (!vendorProfile) return res.status(404).json({ error: 'Vendor profile not found' });

    const { boothSize, durationWeeks, mapLocationId, attendees } = req.body || {};
    if (!['2x2', '4x4'].includes(boothSize)) return res.status(400).json({ error: 'Invalid booth size' });
    const weeks = parseInt(durationWeeks, 10);
    if (!(weeks >= 1 && weeks <= 4)) return res.status(400).json({ error: 'durationWeeks must be 1-4' });
    if (!mapLocationId) return res.status(400).json({ error: 'mapLocationId is required' });
    const attErr = validateAttendees(attendees);
    if (attErr) return res.status(400).json({ error: attErr });

    // Prevent duplicate active requests for same map location (duration overlaps are handled by EO later)
    const exists = await VendorParticipation.findOne({
      vendorProfile,
      kind: 'BOOTH_SETUP',
      mapLocationId,
      status: { $in: ['PENDING', 'ACCEPTED'] },
    }).lean();
    if (exists) return res.status(400).json({ error: 'Active request already exists for this location' });

    const created = await VendorParticipation.create({
      kind: 'BOOTH_SETUP',
      vendorProfile,
      attendees,
      boothSize,
      durationWeeks: weeks,
      mapLocationId,
      status: 'PENDING',
    });

    return res.status(201).json(created);
  } catch (e) { next(e); }
};

exports.getRequestById = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid request id' });
    const r = await VendorParticipation.findById(id).populate('event').lean();
    if (!r) return res.status(404).json({ error: 'Not found' });
    return res.json(r);
  } catch (e) { next(e); }
};

exports.acceptRequest = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid request id' });
    const vp = await VendorParticipation.findById(id);
    if (!vp) return res.status(404).json({ error: 'Not found' });
    if (vp.status === 'ACCEPTED') return res.json(vp);

    vp.status = 'ACCEPTED';
    vp.reviewedBy = req.user?.id;
    vp.reviewedAt = new Date();
    vp.rejectionReason = undefined;
    const saved = await vp.save();
    return res.json(saved);
  } catch (e) { next(e); }
};

exports.rejectRequest = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid request id' });
    const vp = await VendorParticipation.findById(id);
    if (!vp) return res.status(404).json({ error: 'Not found' });
    if (vp.status === 'REJECTED') return res.json(vp);

    vp.status = 'REJECTED';
    vp.reviewedBy = req.user?.id;
    vp.reviewedAt = new Date();
    vp.rejectionReason = req.body?.reason || undefined;
    const saved = await vp.save();
    return res.json(saved);
  } catch (e) { next(e); }
};

exports.listAllRequests = async (req, res, next) => {
  try {
    const { status, kind, vendorProfile, event, page = '1', limit = '20' } = req.query || {};
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};
    if (status && ['PENDING', 'ACCEPTED', 'REJECTED'].includes(String(status).toUpperCase())) {
      filter.status = String(status).toUpperCase();
    }
    if (kind && ['BAZAAR', 'BOOTH_SETUP'].includes(String(kind).toUpperCase())) {
      filter.kind = String(kind).toUpperCase();
    }
    if (vendorProfile && mongoose.isValidObjectId(vendorProfile)) {
      filter.vendorProfile = vendorProfile;
    }
    if (event && mongoose.isValidObjectId(event)) {
      filter.event = event;
    }

    const [items, total] = await Promise.all([
      VendorParticipation.find(filter)
        .populate('event')
        .populate('vendorProfile')
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      VendorParticipation.countDocuments(filter),
    ]);

    return res.json({ data: items, meta: { page: p, limit: l, total, pages: Math.ceil(total / l) || 1 } });
  } catch (e) { next(e); }
};