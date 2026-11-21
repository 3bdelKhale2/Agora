// List only events with zero registrations (for admin deletion)
exports.listUnregisteredEvents = async (req, res, next) => {
  try {
    // Get all events
    const events = await Event.find({});
    // Get event IDs with registrations
    const regs = await Registration.aggregate([
      { $group: { _id: '$event', count: { $sum: 1 } } }
    ]);
    const registeredIds = new Set(regs.map(r => String(r._id)));
    // Filter events with zero registrations
    const unregisteredEvents = events.filter(ev => !registeredIds.has(String(ev._id)));
    res.json({ data: unregisteredEvents });
  } catch (e) {
    next(e);
  }
};
'use strict';

const mongoose = require('mongoose');
const Event = require('../models/eventModel');
const Registration = require('../models/registrationModel');
const User = require('../models/userModel');
const VendorParticipation = require('../models/vendorParticipationModel');

const EVENT_STATUS = Event.EVENT_STATUS;
const EVENT_TYPES = Event.EVENT_TYPES;
const FACULTIES = Event.FACULTIES;

const isValidObjectId = (id) => mongoose.isValidObjectId(id);
const getUser = (req) => req.user || {};
const getUserId = (req) => getUser(req)?.id || getUser(req?._id);
const getUserRoles = (req) => {
  const r = getUser(req)?.roles ?? getUser(req)?.role ?? [];
  return Array.isArray(r) ? r : [r];
};
const hasRole = (req, ...roles) => {
  const userRoles = getUserRoles(req).map(String).map(r => r.toUpperCase());
  return roles.some(role => userRoles.includes(String(role).toUpperCase()));
};
const isOwner = (req, ev) => String(getUserId(req) || '') === String(ev?.createdBy || '');
const isPrivileged = (req) => hasRole(req, 'EVENTS_OFFICE', 'ADMIN');

const typeToDetailKey = {
  WORKSHOP: 'workshopDetails',
  TRIP: 'tripDetails',
  BAZAAR: 'bazaarDetails',
  CONFERENCE: 'conferenceDetails',
  BOOTH_SETUP: 'boothSetupDetails',
  GYM_SESSION: 'gymDetails',
};

const GENERAL_UPDATE_FIELDS = new Set([
  'title',
  'description',
  'location',
  'startAt',
  'endAt',
  'capacity',
  'registrationDeadline',
]);

const FORBIDDEN_UPDATE_FIELDS = new Set([
  '_id',
  'id',
  'type',
  'status',
  'ownerRole',
  'createdBy',
  'reviewedBy',
  'reviewedAt',
  'cancelledAt',
  'cancelledReason',
  'reviewNotes',
  '__v',
  'createdAt',
  'updatedAt',
]);

const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? (acc[k] = obj[k], acc) : acc), {});

const ensureEvent = async (id) => {
  const ev = await Event.findById(id);
  if (!ev) {
    const err = new Error('Event not found');
    err.status = 404;
    throw err;
  }
  return ev;
};

const validateDateRange = (startAt, endAt) => {
  if (!startAt || !endAt) return true;
  const s = new Date(startAt);
  const e = new Date(endAt);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  return s < e;
};

const sanitizeSort = (val, fallback = '-createdAt') => {
  if (typeof val !== 'string' || !val.trim()) return fallback;
  // Allow only safe characters: letters, numbers, underscore, dash, comma, space, dot, plus
  if (!/^[\s,\w\-\.\+]+$/.test(val)) return fallback;
  return val;
};

// Escape user-provided strings for safe use in RegExp
const escapeRegex = (str = '') => String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildCreatePayload = (reqBody, type, ownerRole, createdBy) => {
  const base = {
    type,
    title: reqBody.title,
    description: reqBody.description,
    location: reqBody.location,
    startAt: reqBody.startAt,
    endAt: reqBody.endAt,
    capacity: reqBody.capacity,
    registrationDeadline: reqBody.registrationDeadline,
    ownerRole,
    createdBy,
    // status will use schema default 'PENDING'
  };

  const detailKey = typeToDetailKey[type];
  if (detailKey && reqBody[detailKey] && typeof reqBody[detailKey] === 'object') {
    base[detailKey] = reqBody[detailKey];
  }

  return base;
};

// Normalize and validate faculty input to enum code
const FACULTY_ALIASES = new Map([
  ['APPLIED ARTS', 'APPLIED_ARTS'],
  ['APPLIED_ARTS', 'APPLIED_ARTS'],
  ['APPLIED ART', 'APPLIED_ARTS'],
  ['ARCH ENG', 'ARCH_ENG'],
  ['ARCH. ENG', 'ARCH_ENG'],
  ['ARCH ENG.', 'ARCH_ENG'],
  ['ARCHITECTURE', 'ARCH_ENG'],
  ['CIVIL ENG', 'CIVIL_ENG'],
  ['PHARMACHY', 'PHARMACY'], // common misspelling
  ['PHARMACY', 'PHARMACY'],
]);
const toFacultyCode = (input) => {
  if (!input) return null;
  let s = String(input).trim().toUpperCase();
  s = s.replace(/\./g, '');         // remove dots
  s = s.replace(/\s+/g, ' ');       // collapse spaces
  const alias = FACULTY_ALIASES.get(s) || FACULTY_ALIASES.get(s.replace(/ /g, '_'));
  if (alias && FACULTIES.includes(alias)) return alias;
  const candidate = s.replace(/ /g, '_');
  return FACULTIES.includes(candidate) ? candidate : null;
};

exports.listEvents = async (req, res, next) => {
  try {
    const {
      page = '1',
      limit = '20',
      sort = '-createdAt',
      type,
      status,
      ownerRole,
      createdBy,
      from,
      to,
      q,
      professorName,
      upcoming,
      includeVendors,
      mine,
    } = req.query || {};

    // Pagination
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};

    // Type filter
    if (type) {
      if (!EVENT_TYPES.includes(String(type).toUpperCase())) {
        return res.status(400).json({ error: 'Invalid type filter' });
      }
      filter.type = String(type).toUpperCase();
    }
    // OwnerRole filter
    if (ownerRole) {
      const allowed = ['PROFESSOR', 'EVENTS_OFFICE'];
      if (!allowed.includes(String(ownerRole).toUpperCase())) {
        return res.status(400).json({ error: 'Invalid ownerRole filter' });
      }
      filter.ownerRole = String(ownerRole).toUpperCase();
    }

    // Determine if viewing own items
    let viewingOwn = false;
    if (String(mine).toLowerCase() === '1' || String(mine).toLowerCase() === 'true') {
      if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
      filter.createdBy = req.user.id;
      viewingOwn = true;
    } else if (createdBy) {
      if (String(createdBy).toLowerCase() === 'me') {
        if (!req.user?.id) return res.status(401).json({ error: 'Unauthorized' });
        filter.createdBy = req.user.id;
        viewingOwn = true;
      } else {
        if (!isValidObjectId(createdBy)) {
          return res.status(400).json({ error: 'Invalid createdBy filter' });
        }
        filter.createdBy = createdBy;
        viewingOwn = !!req.user?.id && String(req.user.id) === String(createdBy);
      }
    }

    const requesterPrivileged = isPrivileged(req);

    // Status filter: default to PUBLISHED for public discovery unless privileged or viewing own
    if (status) {
      const st = String(status).toUpperCase();
      if (!EVENT_STATUS.includes(st)) {
        return res.status(400).json({ error: 'Invalid status filter' });
      }
      if (!requesterPrivileged && !viewingOwn && st !== 'PUBLISHED') {
        return res.status(403).json({ error: 'Forbidden status filter' });
      }
      filter.status = st;
    } else if (!requesterPrivileged && !viewingOwn) {
      filter.status = 'PUBLISHED';
    }

    // Date range on startAt
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

    // Upcoming convenience filter
    if (!from && !to && (String(upcoming).toLowerCase() === '1' || String(upcoming).toLowerCase() === 'true')) {
      const now = new Date();
      filter.startAt = { ...(filter.startAt || {}), $gte: now };
    }

    // Text query
    let projection = {};
    let sortBy = sanitizeSort(sort);
    if (q && String(q).trim()) {
      const query = String(q).trim();
      const startsRx = new RegExp(`^\\s*${escapeRegex(query)}`, 'i');
      const containsRx = new RegExp(escapeRegex(query), 'i');
      filter.$or = [
        { title: startsRx },
        { title: containsRx },
        { description: containsRx },
      ];
    }

    // Professor name search (note: workshopDetails.professors are strings)
    if (professorName && String(professorName).trim()) {
      const name = String(professorName).trim();
      const regex = new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [
        ...(filter.$or || []),
        { 'workshopDetails.professors': regex },
      ];
    }

    // If upcoming flag and no explicit sort was provided, default to startAt ascending
    if (!req.query.sort && (String(upcoming).toLowerCase() === '1' || String(upcoming).toLowerCase() === 'true')) {
      sortBy = { startAt: 1 };
    }

    const [items, total] = await Promise.all([
      Event.find(filter, projection).sort(sortBy).skip((p - 1) * l).limit(l).lean(),
      Event.countDocuments(filter),
    ]);

    // Optionally include accepted vendors for BAZAAR and BOOTH_SETUP
    if (String(includeVendors).toLowerCase() === '1' || String(includeVendors).toLowerCase() === 'true') {
      const map = new Map(items.map(ev => [String(ev._id), ev]));
      const targetIds = items
        .filter(ev => ev && (ev.type === 'BAZAAR' || ev.type === 'BOOTH_SETUP'))
        .map(ev => ev._id);
      if (targetIds.length) {
        const parts = await VendorParticipation.find({ event: { $in: targetIds }, status: 'ACCEPTED' })
          .populate('vendorProfile')
          .lean();
        for (const vp of parts) {
          const ev = map.get(String(vp.event));
          if (!ev) continue;
          if (!ev.vendors) ev.vendors = [];
          ev.vendors.push({
            vendorProfile: vp.vendorProfile,
            boothSize: vp.boothSize,
            attendees: vp.attendees,
            durationWeeks: vp.durationWeeks,
            mapLocationId: vp.mapLocationId,
          });
        }
      }
    }

    return res.json({
      data: items,
      meta: {
        page: p,
        limit: l,
        total,
        pages: Math.ceil(total / l) || 1,
      },
    });
  } catch (e) {
    next(e);
  }
};

exports.getEventById = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await Event.findById(id).lean();
    if (!ev) return res.status(404).json({ error: 'Event not found' });

    // Hide non-published events from non-owners/non-EO
    if (ev.status !== 'PUBLISHED' && !(isOwner(req, ev) || isPrivileged(req))) {
      return res.status(404).json({ error: 'Event not found' });
    }

    // Include accepted vendors for bazaars and booths
    if (ev.type === 'BAZAAR' || ev.type === 'BOOTH_SETUP') {
      const accepted = await VendorParticipation.find({ event: id, status: 'ACCEPTED' })
        .populate('vendorProfile')
        .lean();
      return res.json({
        ...ev,
        vendors: accepted.map((vp) => ({
          vendorProfile: vp.vendorProfile,
          boothSize: vp.boothSize,
          attendees: vp.attendees,
          durationWeeks: vp.durationWeeks,
          mapLocationId: vp.mapLocationId,
        })),
      });
    }

    return res.json(ev);
  } catch (e) {
    next(e);
  }
};

const createEventOfType = (type, ownerRole) => async (req, res, next) => {
  try {
    const creator = getUserId(req);
    if (!creator) return res.status(401).json({ error: 'Unauthorized' });

    // Validate required base fields
    const { title, startAt, endAt } = req.body || {};
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!startAt || !endAt) return res.status(400).json({ error: 'startAt and endAt are required' });
    if (!validateDateRange(startAt, endAt)) return res.status(400).json({ error: 'endAt must be after startAt' });

    // Enforce ownerRole as per endpoint
    const payload = buildCreatePayload(req.body || {}, type, ownerRole, creator);

    const saved = await Event.create(payload);
    return res.status(201).json(saved);
  } catch (e) {
    next(e);
  }
};

exports.createWorkshop = async (req, res) => {
  try {
    const creator = getUserId(req)
    if (!creator) return res.status(401).json({ error: 'Unauthorized' })

    const {
      title,
      location,
      price,
      startAt,
      endAt,
      shortDescription,
      fullAgenda,
      faculty,
      professors,
      requiredBudget,
      fundingSource,
      extraResources,
      capacity,
      registrationDeadline,
    } = req.body || {}

    // Required fields per requirements
    if (!title) return res.status(400).json({ error: 'title is required' })
    if (!location) return res.status(400).json({ error: 'location is required' })
    if (!startAt || !endAt) return res.status(400).json({ error: 'startAt and endAt are required' })
    if (!shortDescription) return res.status(400).json({ error: 'shortDescription is required' })
    if (!fullAgenda) return res.status(400).json({ error: 'fullAgenda is required' })
    if (!faculty) return res.status(400).json({ error: 'faculty is required' })
    if (requiredBudget === undefined || requiredBudget === null || requiredBudget === '') {
      return res.status(400).json({ error: 'requiredBudget is required' })
    }
    if (!fundingSource) return res.status(400).json({ error: 'fundingSource is required' })
    if (capacity === undefined || capacity === null || capacity === '')
      return res.status(400).json({ error: 'capacity is required' })
    if (!registrationDeadline) return res.status(400).json({ error: 'registrationDeadline is required' })
    if (price === undefined || price === null || price === '')
      return res.status(400).json({ error: 'price is required' })

    // Types and constraints
    const loc = String(location).toUpperCase()
    if (!['GUC_CAIRO', 'GUC_BERLIN'].includes(loc)) {
      return res.status(400).json({ error: 'location must be GUC_CAIRO or GUC_BERLIN' })
    }
    const start = new Date(startAt)
    const end = new Date(endAt)
    const regD = new Date(registrationDeadline)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid startAt or endAt' })
    if (!validateDateRange(start, end)) return res.status(400).json({ error: 'endAt must be after startAt' })
    if (Number.isNaN(regD.getTime())) return res.status(400).json({ error: 'Invalid registrationDeadline' })
    if (!(regD < start)) return res.status(400).json({ error: 'registrationDeadline must be before startAt' })

    const capNum = Number(capacity)
    if (!Number.isFinite(capNum) || capNum <= 0 || !Number.isInteger(capNum)) {
      return res.status(400).json({ error: 'capacity must be a positive integer' })
    }

    let fs = String(fundingSource).toUpperCase()
    if (!['GUC', 'EXTERNAL'].includes(fs)) {
      return res.status(400).json({ error: 'fundingSource must be EXTERNAL or GUC' })
    }

    const rb = Number(requiredBudget)
    if (!Number.isFinite(rb) || rb < 0) {
      return res.status(400).json({ error: 'requiredBudget must be a non-negative number' })
    }

    const priceNum = Number(price)
    if (!Number.isFinite(priceNum) || priceNum < 0) {
      return res.status(400).json({ error: 'price must be a non-negative number' })
    }

    // Faculty normalization to enum
    const facultyCode = toFacultyCode(faculty);
    if (!facultyCode) {
      return res.status(400).json({ error: 'faculty must be one of: ' + FACULTIES.join(', ') })
    }

    // Professors must be a non-empty array of names
    const profs = Array.isArray(professors)
      ? professors.map(s => String(s || '').trim()).filter(Boolean)
      : [];
    if (profs.length === 0) {
      return res.status(400).json({ error: 'At least one professor is required' })
    }

    // Persist base + workshopDetails (consistent with typeToDetailKey)
    const payload = {
      type: 'WORKSHOP',
      ownerRole: 'PROFESSOR',
      createdBy: creator,
      title,
      description: shortDescription,   // mirror shortDescription into base description
      location: loc,
      startAt: start,
      endAt: end,
      capacity: capNum,
      registrationDeadline: regD,
      // root fields (mirrored for searches/UI)
      shortDescription,
      fullAgenda,
      faculty: facultyCode,
      professors: profs,
      requiredBudget: rb,
      price: priceNum,
      fundingSource: fs,
      extraResources: extraResources || undefined,
      workshopDetails: {
        shortDescription,
        fullAgenda,
        faculty: facultyCode,
        professors: profs,
        requiredBudget: rb,
        price: priceNum,
        fundingSource: fs,
        extraResources: extraResources || undefined,
      },
      // status uses schema default (PENDING)
    }

    const event = await Event.create(payload)
    return res.status(201).json({ data: event })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
}

// Custom createTrip to enforce required fields for Events Office trips
exports.createTrip = async (req, res, next) => {
  try {
    const creator = getUserId(req);
    if (!creator) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title,
      location,
      price,
      startAt,
      endAt,
      shortDescription,
      capacity,
      registrationDeadline,
    } = req.body || {};

    // Required fields per requirements
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!location) return res.status(400).json({ error: 'location is required' });
    if (price === undefined || price === null || price === '') return res.status(400).json({ error: 'price is required' });
    if (capacity === undefined || capacity === null || capacity === '') return res.status(400).json({ error: 'capacity is required' });
    if (!registrationDeadline) return res.status(400).json({ error: 'registrationDeadline is required' });
    if (!shortDescription) return res.status(400).json({ error: 'shortDescription is required' });
    if (!startAt || !endAt) return res.status(400).json({ error: 'startAt and endAt are required' });

    // Types and constraints
    const start = new Date(startAt);
    const end = new Date(endAt);
    const regD = new Date(registrationDeadline);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return res.status(400).json({ error: 'Invalid startAt or endAt' });
    if (!validateDateRange(start, end)) return res.status(400).json({ error: 'endAt must be after startAt' });
    if (Number.isNaN(regD.getTime())) return res.status(400).json({ error: 'Invalid registrationDeadline' });
    if (!(regD < start)) return res.status(400).json({ error: 'registrationDeadline must be before startAt' });

    const priceNum = Number(price);
    if (!Number.isFinite(priceNum) || priceNum < 0) return res.status(400).json({ error: 'price must be a non-negative number' });

    const capacityNum = Number(capacity);
    if (!Number.isFinite(capacityNum) || capacityNum <= 0 || !Number.isInteger(capacityNum)) {
      return res.status(400).json({ error: 'capacity must be a positive integer' });
    }

    // Build payload: mirror essentials into base and tripDetails
    const payload = {
      type: 'TRIP',
      ownerRole: 'EVENTS_OFFICE',
      createdBy: creator,
      title,
      description: shortDescription, // keep base description synced with shortDescription
      location,
      startAt: start,
      endAt: end,
      capacity: capacityNum,
      registrationDeadline: regD,
      tripDetails: {
        location,
        price: priceNum,
        shortDescription,
        capacity: capacityNum,
        registrationDeadline: regD,
      },
    };

    const saved = await Event.create(payload);
    return res.status(201).json(saved);
  } catch (e) {
    next(e);
  }
};
// Custom createBazaar to enforce full required fields for Events Office bazaars
exports.createBazaar = async (req, res, next) => {
  try {
    const creator = getUserId(req);
    if (!creator) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title,
      location,
      shortDescription,
      startAt,
      endAt,
      registrationDeadline,
      allowsVendors,
    } = req.body || {};

    // Required fields per requirements
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!location) return res.status(400).json({ error: 'location is required' });
    if (!shortDescription) return res.status(400).json({ error: 'shortDescription is required' });
    if (!startAt || !endAt) return res.status(400).json({ error: 'startAt and endAt are required' });
    if (!registrationDeadline) return res.status(400).json({ error: 'registrationDeadline is required' });

    // Validate dates
    const start = new Date(startAt);
    const end = new Date(endAt);
    const regD = new Date(registrationDeadline);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid startAt or endAt' });
    }
    if (!validateDateRange(start, end)) {
      return res.status(400).json({ error: 'endAt must be after startAt' });
    }
    if (Number.isNaN(regD.getTime())) {
      return res.status(400).json({ error: 'Invalid registrationDeadline' });
    }
    if (!(regD < start)) {
      return res.status(400).json({ error: 'registrationDeadline must be before startAt' });
    }

    // Build payload: mirror essentials into base and bazaarDetails
    const payload = {
      type: 'BAZAAR',
      ownerRole: 'EVENTS_OFFICE',
      createdBy: creator,
      title,
      description: shortDescription, // keep base description synced with shortDescription
      location,
      startAt: start,
      endAt: end,
      registrationDeadline: regD,
      bazaarDetails: {
        registrationDeadline: regD,
        allowsVendors: allowsVendors === undefined ? true : Boolean(allowsVendors),
      },
    };

    const saved = await Event.create(payload);
    return res.status(201).json(saved);
  } catch (e) {
    next(e);
  }
};
// Custom createConference to enforce required fields for Events Office conferences
exports.createConference = async (req, res, next) => {
  try {
    const creator = getUserId(req);
    if (!creator) return res.status(401).json({ error: 'Unauthorized' });

    const {
      title,
      startAt,
      endAt,
      shortDescription,
      fullAgenda,
      website,
      requiredBudget,
      fundingSource,
      extraResources,
    } = req.body || {};

    // Required
    if (!title) return res.status(400).json({ error: 'title is required' });
    if (!startAt || !endAt) return res.status(400).json({ error: 'startAt and endAt are required' });
    if (!shortDescription) return res.status(400).json({ error: 'shortDescription is required' });
    if (!website) return res.status(400).json({ error: 'website is required' });
    if (requiredBudget === undefined || requiredBudget === null || requiredBudget === '') {
      return res.status(400).json({ error: 'requiredBudget is required' });
    }
    if (!fundingSource) return res.status(400).json({ error: 'fundingSource is required' });

    // Validate dates
    const start = new Date(startAt);
    const end = new Date(endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return res.status(400).json({ error: 'Invalid startAt or endAt' });
    }
    if (!validateDateRange(start, end)) {
      return res.status(400).json({ error: 'endAt must be after startAt' });
    }

    // Validate fields
    const budgetNum = Number(requiredBudget);
    if (!Number.isFinite(budgetNum) || budgetNum < 0) {
      return res.status(400).json({ error: 'requiredBudget must be a non-negative number' });
    }
    const fs = String(fundingSource).toUpperCase();
    if (!['EXTERNAL', 'GUC'].includes(fs)) {
      return res.status(400).json({ error: 'fundingSource must be EXTERNAL or GUC' });
    }
    const site = String(website).trim();
    // Basic URL check (allow http/https or domain-like); keep lenient per note
    const urlOk = /^(https?:\/\/)?[\w.-]+(\.[\w.-]+)+[/\w\-._~:?#[\]@!$&'()*+,;=.]*$/.test(site);
    if (!urlOk) return res.status(400).json({ error: 'website must be a valid URL' });

    // Build payload
    const payload = {
      type: 'CONFERENCE',
      ownerRole: 'EVENTS_OFFICE',
      createdBy: creator,
      title,
      description: shortDescription, // mirror
      startAt: start,
      endAt: end,
      conferenceDetails: {
        shortDescription,
        fullAgenda: fullAgenda || undefined,
        website: site,
        requiredBudget: budgetNum,
        fundingSource: fs,
        extraResources: extraResources || undefined,
      },
    };

    const saved = await Event.create(payload);
    return res.status(201).json(saved);
  } catch (e) {
    next(e);
  }
};
exports.createGymSession = createEventOfType('GYM_SESSION', 'EVENTS_OFFICE');
exports.createBoothSetup = createEventOfType('BOOTH_SETUP', 'EVENTS_OFFICE');

exports.updateEvent = async (req, res) => {
  try {
    const id = req.params.id
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' })

    const ev = await Event.findById(id)
    if (!ev) return res.status(404).json({ error: 'Event not found' })

    // For workshops: only the owner professor can edit (EO/Admin cannot directly edit)
    if (ev.type === 'WORKSHOP' && !isOwner(req, ev)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    // For other types: owner or privileged can update
    if (ev.type !== 'WORKSHOP' && !(isOwner(req, ev) || isPrivileged(req))) {
      return res.status(403).json({ error: 'Forbidden' })
    }

    // Block editing after publish/cancel for non-privileged users, except allow workshop owners to edit in all cases
    if (!isPrivileged(req)
      && ['PUBLISHED', 'CANCELLED'].includes(ev.status)
      && !(ev.type === 'WORKSHOP' && isOwner(req, ev))) {
      return res.status(400).json({ error: 'Cannot edit event after it is published or cancelled' })
    }

    const body = req.body || {}
    const toSet = {}

    // Base fields
    if ('title' in body) toSet.title = body.title
    if ('location' in body) {
      const loc = String(body.location).toUpperCase()
      if (!['GUC_CAIRO', 'GUC_BERLIN'].includes(loc)) {
        return res.status(400).json({ error: 'location must be GUC_CAIRO or GUC_BERLIN' })
      }
      toSet.location = loc
    }
    if ('startAt' in body) toSet.startAt = new Date(body.startAt)
    if ('endAt' in body) toSet.endAt = new Date(body.endAt)
    if ('capacity' in body) {
      const cap = Number(body.capacity)
      if (!Number.isFinite(cap) || cap <= 0 || !Number.isInteger(cap)) {
        return res.status(400).json({ error: 'capacity must be a positive integer' })
      }
      toSet.capacity = cap
    }
    if ('registrationDeadline' in body) toSet.registrationDeadline = new Date(body.registrationDeadline)

    // Validate dates if present
    const start = 'startAt' in toSet ? new Date(toSet.startAt) : ev.startAt
    const end = 'endAt' in toSet ? new Date(toSet.endAt) : ev.endAt
    if (!validateDateRange(start, end)) {
      return res.status(400).json({ error: 'endAt must be after startAt' })
    }
    const regD = 'registrationDeadline' in toSet ? new Date(toSet.registrationDeadline) : ev.registrationDeadline
    if (regD && !(new Date(regD) < new Date(start))) {
      return res.status(400).json({ error: 'registrationDeadline must be before startAt' })
    }

    // Workshop-specific fields go under workshopDetails and mirror root fields
    if (ev.type === 'WORKSHOP') {
      if ('shortDescription' in body) {
        toSet.description = body.shortDescription
        toSet.shortDescription = body.shortDescription
        toSet['workshopDetails.shortDescription'] = body.shortDescription
      }
      if ('fullAgenda' in body) {
        toSet.fullAgenda = body.fullAgenda
        toSet['workshopDetails.fullAgenda'] = body.fullAgenda
      }
      if ('faculty' in body) {
        const code = toFacultyCode(body.faculty)
        if (!code) return res.status(400).json({ error: 'faculty must be one of: ' + FACULTIES.join(', ') })
        toSet.faculty = code
        toSet['workshopDetails.faculty'] = code
      }
      if ('professors' in body) {
        const profs = Array.isArray(body.professors)
          ? body.professors.map(s => String(s || '').trim()).filter(Boolean)
          : []
        if (profs.length === 0) return res.status(400).json({ error: 'At least one professor is required' })
        toSet.professors = profs
        toSet['workshopDetails.professors'] = profs
      }
      if ('requiredBudget' in body) {
        const rb = Number(body.requiredBudget)
        if (!Number.isFinite(rb) || rb < 0) {
          return res.status(400).json({ error: 'requiredBudget must be a non-negative number' })
        }
        toSet.requiredBudget = rb
        toSet['workshopDetails.requiredBudget'] = rb
      }
      if ('fundingSource' in body) {
        const fs = String(body.fundingSource).toUpperCase()
        if (!['GUC', 'EXTERNAL'].includes(fs)) {
          return res.status(400).json({ error: 'fundingSource must be EXTERNAL or GUC' })
        }
        toSet.fundingSource = fs
        toSet['workshopDetails.fundingSource'] = fs
      }
      if ('extraResources' in body) {
        const er = body.extraResources || undefined
        toSet.extraResources = er
        toSet['workshopDetails.extraResources'] = er
      }
    }

    // Guard forbidden fields just in case
    for (const key of Object.keys(body)) {
      if (FORBIDDEN_UPDATE_FIELDS.has(key)) {
        return res.status(400).json({ error: `Field ${key} cannot be updated` })
      }
    }

    const updated = await Event.findByIdAndUpdate(id, { $set: toSet }, { new: true })
    if (!updated) return res.status(404).json({ error: 'Event not found' })
    return res.status(200).json({ data: updated })
  } catch (e) {
    return res.status(500).json({ error: e.message })
  }
};

exports.publishEvent = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await ensureEvent(id);

    // Only publish from PENDING or NEEDS_EDITS
    if (!['PENDING', 'NEEDS_EDITS'].includes(ev.status)) {
      return res.status(400).json({ error: 'Only PENDING or NEEDS_EDITS events can be published' });
    }

    ev.status = 'PUBLISHED';
    ev.reviewedBy = getUserId(req) || ev.reviewedBy;
    ev.reviewedAt = new Date();
    if (req.body?.reviewNotes) ev.reviewNotes = String(req.body.reviewNotes);

    const saved = await ev.save();
    return res.json(saved);
  } catch (e) {
    next(e);
  }
};

exports.rejectEvent = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await ensureEvent(id);

    // Only reject from PENDING or NEEDS_EDITS
    if (!['PENDING', 'NEEDS_EDITS'].includes(ev.status)) {
      return res.status(400).json({ error: 'Only PENDING or NEEDS_EDITS events can be rejected' });
    }

    ev.status = 'REJECTED';
    ev.reviewedBy = getUserId(req) || ev.reviewedBy;
    ev.reviewedAt = new Date();
    if (req.body?.reviewNotes) ev.reviewNotes = String(req.body.reviewNotes);

    const saved = await ev.save();
    return res.json(saved);
  } catch (e) {
    next(e);
  }
};

exports.requestEdits = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await ensureEvent(id);

    // Restrict to workshops per requirements
    if (ev.type !== 'WORKSHOP') {
      return res.status(400).json({ error: 'Only workshops support request edits' });
    }

    // Allow requesting edits from PENDING, PUBLISHED, or when already in NEEDS_EDITS (to update proposed changes)
    const originalStatus = ev.status;
    if (!['PENDING', 'PUBLISHED', 'NEEDS_EDITS'].includes(originalStatus)) {
      return res.status(400).json({ error: 'Only PENDING, PUBLISHED, or NEEDS_EDITS workshops can receive edit requests' });
    }

  ev.status = 'NEEDS_EDITS';
    ev.reviewedBy = getUserId(req) || ev.reviewedBy;
    ev.reviewedAt = new Date();
    if (req.body?.reviewNotes) ev.reviewNotes = String(req.body.reviewNotes);

    // Optional: include proposed changes so professor can accept to auto-apply
    const body = req.body || {};
    if (body.proposedChanges && typeof body.proposedChanges === 'object') {
      const allowed = new Set([
        'title','location','startAt','endAt','capacity','registrationDeadline',
        'shortDescription','fullAgenda','faculty','professors','requiredBudget','fundingSource','extraResources'
      ]);
      const changes = {};
      for (const [k,v] of Object.entries(body.proposedChanges)) {
        if (allowed.has(k)) changes[k] = v;
      }
      const prevStatus = ev.pendingUpdate?.prevStatus || (originalStatus !== 'NEEDS_EDITS' ? originalStatus : 'PENDING');
      if (Object.keys(changes).length) {
        ev.pendingUpdate = {
          changes,
          note: body.reviewNotes ? String(body.reviewNotes) : undefined,
          proposedBy: getUserId(req) || undefined,
          proposedAt: new Date(),
          prevStatus,
          response: undefined,
        };
      } else {
        // Even if no changes, ensure prevStatus recorded the first time we enter NEEDS_EDITS
        ev.pendingUpdate = {
          ...(ev.pendingUpdate || {}),
          note: body.reviewNotes ? String(body.reviewNotes) : (ev.pendingUpdate?.note || undefined),
          proposedBy: getUserId(req) || ev.pendingUpdate?.proposedBy || undefined,
          proposedAt: ev.pendingUpdate?.proposedAt || new Date(),
          prevStatus,
        };
      }
    }

    const saved = await ev.save();
    return res.json(saved);
  } catch (e) {
    next(e);
  }
};

exports.acceptProposedEdits = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await ensureEvent(id);
    // Only owner professor may accept
    if (!isOwner(req, ev)) return res.status(403).json({ error: 'Forbidden' });
    if (ev.type !== 'WORKSHOP') return res.status(400).json({ error: 'Only workshops support proposed edits flow' });
    if (!ev.pendingUpdate || !ev.pendingUpdate.changes) return res.status(400).json({ error: 'No proposed edits to accept' });

    // Reuse validation path from updateEvent: construct a minimal request-like body
    const updBody = ev.pendingUpdate.changes || {};

    // Apply through the same logic by mimicking the req body and permissions
    // We will inline key validations similar to updateEvent to avoid recursion
    const toSet = {};
    if ('title' in updBody) toSet.title = updBody.title;
    if ('location' in updBody) {
      const loc = String(updBody.location).toUpperCase();
      if (!['GUC_CAIRO','GUC_BERLIN'].includes(loc)) return res.status(400).json({ error: 'location must be GUC_CAIRO or GUC_BERLIN' });
      toSet.location = loc;
    }
    if ('startAt' in updBody) toSet.startAt = new Date(updBody.startAt);
    if ('endAt' in updBody) toSet.endAt = new Date(updBody.endAt);
    if ('capacity' in updBody) {
      const raw = updBody.capacity;
      if (raw !== '' && raw !== null && raw !== undefined) {
        const cap = Number(raw);
        if (Number.isFinite(cap) && cap > 0 && Number.isInteger(cap)) {
          toSet.capacity = cap;
        }
        // else skip invalid capacity to avoid blocking acceptance
      }
    }
    if ('registrationDeadline' in updBody) {
      const rd = new Date(updBody.registrationDeadline);
      if (!Number.isNaN(rd.getTime())) toSet.registrationDeadline = rd;
    }

    const start = 'startAt' in toSet ? new Date(toSet.startAt) : ev.startAt;
    const end = 'endAt' in toSet ? new Date(toSet.endAt) : ev.endAt;
    if (!validateDateRange(start, end)) return res.status(400).json({ error: 'endAt must be after startAt' });
    const regD = 'registrationDeadline' in toSet ? new Date(toSet.registrationDeadline) : ev.registrationDeadline;
    if (regD && !(new Date(regD) < new Date(start))) {
      // If proposed reg deadline invalid relative to start, drop it and continue
      if ('registrationDeadline' in toSet) delete toSet.registrationDeadline;
    }

    // Workshop fields
    if ('shortDescription' in updBody) {
      toSet.description = updBody.shortDescription;
      toSet.shortDescription = updBody.shortDescription;
      toSet['workshopDetails.shortDescription'] = updBody.shortDescription;
    }
    if ('fullAgenda' in updBody) {
      toSet.fullAgenda = updBody.fullAgenda;
      toSet['workshopDetails.fullAgenda'] = updBody.fullAgenda;
    }
    if ('faculty' in updBody) {
      const code = toFacultyCode(updBody.faculty);
      if (!code) return res.status(400).json({ error: 'faculty must be one of: ' + FACULTIES.join(', ') });
      toSet.faculty = code;
      toSet['workshopDetails.faculty'] = code;
    }
    if ('professors' in updBody) {
      const profs = Array.isArray(updBody.professors)
        ? updBody.professors.map(s => String(s || '').trim()).filter(Boolean)
        : [];
      if (profs.length > 0) {
        toSet.professors = profs;
        toSet['workshopDetails.professors'] = profs;
      }
      // else skip empty professors list to avoid blocking acceptance
    }
    if ('requiredBudget' in updBody) {
      const rb = Number(updBody.requiredBudget);
      if (!Number.isFinite(rb) || rb < 0) return res.status(400).json({ error: 'requiredBudget must be a non-negative number' });
      toSet.requiredBudget = rb;
      toSet['workshopDetails.requiredBudget'] = rb;
    }
    if ('fundingSource' in updBody) {
      const fs = String(updBody.fundingSource).toUpperCase();
      if (!['GUC','EXTERNAL'].includes(fs)) return res.status(400).json({ error: 'fundingSource must be EXTERNAL or GUC' });
      toSet.fundingSource = fs;
      toSet['workshopDetails.fundingSource'] = fs;
    }
    if ('extraResources' in updBody) {
      const er = updBody.extraResources || undefined;
      toSet.extraResources = er;
      toSet['workshopDetails.extraResources'] = er;
    }

    const updated = await Event.findByIdAndUpdate(id, { $set: toSet }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Event not found' });

    // When accepted, restore prior status if available (e.g., back to PUBLISHED),
    // otherwise move to PENDING so EO can publish.
    const prevStatus = (updated.pendingUpdate && updated.pendingUpdate.prevStatus) || null;
    if (updated.status === 'NEEDS_EDITS') {
      if (prevStatus && ['PUBLISHED','PENDING','NEEDS_EDITS'].includes(prevStatus)) {
        updated.status = prevStatus === 'NEEDS_EDITS' ? 'PENDING' : prevStatus;
      } else {
        updated.status = 'PENDING';
      }
    }
    // Clear pendingUpdate
    updated.pendingUpdate = undefined;
    await updated.save();
    return res.json({ data: updated });
  } catch (e) {
    next(e);
  }
};

exports.deleteEventIfNoRegistrations = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await ensureEvent(id);

    // Ensure there are no registrations linked to this event
    const regCount = await Registration.countDocuments({ event: id });
    if (regCount > 0) return res.status(400).json({ error: 'Cannot delete event with registrations' });

    await Event.deleteOne({ _id: id });
    return res.status(204).send();
  } catch (e) {
    next(e);
  }
};

exports.cancelEvent = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await ensureEvent(id);

    // Only EO/Admin may cancel
    if (!isPrivileged(req)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    if (ev.status === 'CANCELLED') {
      return res.json(ev);
    }

    ev.status = 'CANCELLED';
    ev.cancelledAt = new Date();
    if (req.body?.cancelledReason) ev.cancelledReason = String(req.body.cancelledReason);

    const saved = await ev.save();
    return res.json(saved);
  } catch (e) {
    next(e);
  }
};

exports.rejectProposedEdits = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!isValidObjectId(id)) return res.status(400).json({ error: 'Invalid event id' });

    const ev = await ensureEvent(id);
    if (!isOwner(req, ev)) return res.status(403).json({ error: 'Forbidden' });
    if (ev.type !== 'WORKSHOP') return res.status(400).json({ error: 'Only workshops support proposed edits flow' });
    if (!ev.pendingUpdate || !ev.pendingUpdate.changes) return res.status(400).json({ error: 'No proposed edits to reject' });

    const note = req.body?.note ? String(req.body.note) : undefined;
    ev.pendingUpdate = {
      ...(ev.pendingUpdate || {}),
      response: { status: 'REJECTED', note, by: getUserId(req) || undefined, at: new Date() }
    };
    // Keep status as NEEDS_EDITS; EO will follow up
    const saved = await ev.save();
    return res.json({ data: saved });
  } catch (e) { next(e); }
};