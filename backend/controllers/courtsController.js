const mongoose = require('mongoose');
const Court = require('../models/courtModel');
const CourtSlot = require('../models/courtSlotModel');

exports.listCourts = async (req, res, next) => {
  try {
    const courts = await Court.find({ active: true }).lean();
    return res.json(courts);
  } catch (e) { next(e); }
};

exports.listAllAvailability = async (req, res, next) => {
  try {
    const { sport, from, to, onlyAvailable } = req.query || {};
    const courtFilter = { active: true };
    if (sport) {
      const s = String(sport).toUpperCase();
      if (!['BASKETBALL','TENNIS','FOOTBALL'].includes(s)) {
        return res.status(400).json({ error: 'Invalid sport filter' });
      }
      courtFilter.sport = s;
    }
    const courts = await Court.find(courtFilter).lean();
    const courtIds = courts.map(c => c._id);
    if (courtIds.length === 0) return res.json([]);

    const slotFilter = { court: { $in: courtIds } };
    if (from || to) {
      slotFilter.startAt = {};
      if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid from date' });
        slotFilter.startAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid to date' });
        slotFilter.startAt.$lte = d;
      }
    }
    if (onlyAvailable === '1' || onlyAvailable === 'true') {
      slotFilter.isBooked = false;
    }

    const slots = await CourtSlot.find(slotFilter).sort({ court: 1, startAt: 1 }).lean();

    // Group slots by court id
    const byCourt = new Map();
    for (const s of slots) {
      const k = s.court.toString();
      if (!byCourt.has(k)) byCourt.set(k, []);
      byCourt.get(k).push({ _id: s._id, startAt: s.startAt, endAt: s.endAt, isBooked: s.isBooked });
    }

    const result = courts.map(c => ({
      court: { _id: c._id, name: c.name, sport: c.sport, location: c.location },
      slots: byCourt.get(c._id.toString()) || [],
    }));
    return res.json({ data: result });
  } catch (e) { next(e); }
};

exports.listCourtSlots = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid court id' });

    const { from, to } = req.query || {};
    const filter = { court: id };
    if (from || to) {
      filter.startAt = {};
      if (from) {
        const d = new Date(from);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid from date' });
        filter.startAt.$gte = d;
      }
      if (to) {
        const d = new Date(to);
        if (Number.isNaN(d.getTime())) return res.status(400).json({ error: 'Invalid to date' });
        filter.startAt.$lte = d;
      }
    }

    const slots = await CourtSlot.find(filter).sort({ startAt: 1 }).lean();
    return res.json(slots);
  } catch (e) { next(e); }
};