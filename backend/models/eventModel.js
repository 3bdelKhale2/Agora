const mongoose = require('mongoose');
const { Schema } = mongoose;

const EVENT_TYPES = ['WORKSHOP', 'TRIP', 'BAZAAR', 'CONFERENCE', 'BOOTH_SETUP', 'GYM_SESSION'];
const EVENT_STATUS = ['PENDING', 'PUBLISHED', 'REJECTED', 'NEEDS_EDITS', 'CANCELLED'];
const OWNER_ROLES = ['PROFESSOR', 'EVENTS_OFFICE'];

// Faculty enum (normalized)
const FACULTIES = [
  'MET',
  'IET',
  'DMET',
  'APPLIED_ARTS',
  'ARCH_ENG',
  'CIVIL_ENG',
  'PHARMACY',
  'BI',
  'DENTISTRY',
];

const workshopDetailsSchema = new Schema(
  {
    // location is kept on the root schema (location enum)
    // campus: deprecated; use root location
    // campus: { type: String, enum: ['GUC_CAIRO', 'GUC_BERLIN'] },

    shortDescription: { type: String },
    fullAgenda: { type: String },
    faculty: { type: String, enum: FACULTIES }, // MET, IET, ...
    // professors are names, not user refs (matches frontend payload)
    professors: [{ type: String }],
    requiredBudget: { type: Number, min: 0 },
    fundingSource: { type: String, enum: ['EXTERNAL', 'GUC'] },
    extraResources: String,
    // Reintroduced per-attendee price for payment flow
    price: { type: Number, min: 0 },

    // capacity and registrationDeadline are stored on root (avoid duplication)
    // capacity: Number,
    // registrationDeadline: Date,
  },
  { _id: false }
);

const tripDetailsSchema = new Schema(
  {
    location: String,
    price: Number,
    shortDescription: String,
    capacity: Number,
    registrationDeadline: Date,
  },
  { _id: false }
);

const conferenceDetailsSchema = new Schema(
  {
    shortDescription: String,
    fullAgenda: String,
    website: String,
    requiredBudget: Number,
    fundingSource: { type: String, enum: ['EXTERNAL', 'GUC'] },
    extraResources: String,
  },
  { _id: false }
);

const bazaarDetailsSchema = new Schema(
  {
    registrationDeadline: Date,
    allowsVendors: { type: Boolean, default: true },
  },
  { _id: false }
);

const boothSetupDetailsSchema = new Schema(
  {
    mapLocationId: { type: String }, // id from a predefined map/grid
    boothSize: { type: String, enum: ['2x2', '4x4'] },
    durationWeeks: { type: Number, min: 1, max: 4 },
  },
  { _id: false }
);

const gymDetailsSchema = new Schema(
  {
    sessionType: {
      type: String,
      enum: ['YOGA', 'PILATES', 'AEROBICS', 'ZUMBA', 'CROSS_CIRCUIT', 'KICK_BOXING'],
    },
    durationMinutes: { type: Number, min: 10, max: 240 },
    maxParticipants: { type: Number, min: 1 },
  },
  { _id: false }
);

const eventSchema = new Schema(
  {
    type: { type: String, enum: EVENT_TYPES, required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    location: { type: String, enum: ['GUC_CAIRO', 'GUC_BERLIN'], required: true },

    // Keep these root fields for UI compatibility (mirrored from workshopDetails)
    shortDescription: { type: String, required() { return this.type === 'WORKSHOP'; } },
    fullAgenda: { type: String, required() { return this.type === 'WORKSHOP'; } },
    faculty: { type: String, enum: FACULTIES, required() { return this.type === 'WORKSHOP'; } },
    professors: [{
      type: String,
      // Enforce at least one professor for WORKSHOP in a custom validator below
    }],
    requiredBudget: { type: Number, min: 0, required() { return this.type === 'WORKSHOP'; } },
    // Root price mirror for workshop payments when provided nested
    price: { type: Number, min: 0, required() { return this.type === 'WORKSHOP'; } },
    fundingSource: { type: String, enum: ['GUC', 'EXTERNAL'], required() { return this.type === 'WORKSHOP'; } },
    extraResources: { type: String },

    capacity: { type: Number, min: 1, required() { return this.type === 'WORKSHOP'; } },
    registrationDeadline: { type: Date, required() { return this.type === 'WORKSHOP'; } },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    status: { type: String, enum: EVENT_STATUS, default: 'PENDING', index: true },
    ownerRole: { type: String, enum: OWNER_ROLES, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewNotes: { type: String },

    workshopDetails: { type: workshopDetailsSchema },
    tripDetails: { type: tripDetailsSchema },
    conferenceDetails: { type: conferenceDetailsSchema },
    bazaarDetails: { type: bazaarDetailsSchema },
    boothSetupDetails: { type: boothSetupDetailsSchema },
    gymDetails: { type: gymDetailsSchema },

    cancelledAt: { type: Date },
    cancelledReason: { type: String },

    // Proposed edits flow: EO can propose edits; professor can accept to auto-apply
    pendingUpdate: {
      changes: { type: Schema.Types.Mixed }, // sanitized subset of updatable fields
      note: { type: String },
      proposedBy: { type: Schema.Types.ObjectId, ref: 'User' },
      proposedAt: { type: Date },
      // Track the previous status before moving to NEEDS_EDITS (e.g., PUBLISHED)
      prevStatus: { type: String, enum: EVENT_STATUS },
      response: {
        status: { type: String, enum: ['ACCEPTED','REJECTED'], required: false },
        note: { type: String },
        by: { type: Schema.Types.ObjectId, ref: 'User' },
        at: { type: Date },
      }
    },
  },
  { timestamps: true }
);

// Require at least one professor for WORKSHOP
eventSchema.path('professors').validate(function (val) {
  if (this.type !== 'WORKSHOP') return true;
  return Array.isArray(val) && val.length > 0 && val.every(v => typeof v === 'string' && v.trim().length > 0);
}, 'At least one professor is required for workshops');

// Registration deadline must be before startAt when provided
eventSchema.pre('validate', function (next) {
  if (this.registrationDeadline && this.startAt) {
    if (!(new Date(this.registrationDeadline) < new Date(this.startAt))) {
      return next(new Error('registrationDeadline must be before startAt'));
    }
  }
  // Also ensure endAt after startAt
  if (this.startAt && this.endAt) {
    if (!(new Date(this.startAt) < new Date(this.endAt))) {
      return next(new Error('endAt must be after startAt'));
    }
  }
  next();
});

// Mirror nested workshopDetails into root fields for compatibility when documents are created with nested data
eventSchema.pre('save', function(next) {
  const wd = this.workshopDetails || {};
  if (wd.shortDescription && !this.shortDescription) this.shortDescription = wd.shortDescription;
  if (wd.fullAgenda && !this.fullAgenda) this.fullAgenda = wd.fullAgenda;
  if (wd.faculty && !this.faculty) this.faculty = wd.faculty;
  if (Array.isArray(wd.professors) && (!Array.isArray(this.professors) || this.professors.length === 0)) {
    this.professors = wd.professors;
  }
  if (wd.requiredBudget != null && this.requiredBudget == null) this.requiredBudget = wd.requiredBudget;
  if (wd.fundingSource && !this.fundingSource) this.fundingSource = wd.fundingSource;
  if (wd.extraResources && !this.extraResources) this.extraResources = wd.extraResources;
  next();
});

// Discovery/search
eventSchema.index({ title: 'text', description: 'text', type: 'text' });

module.exports = mongoose.model('Event', eventSchema);
module.exports.EVENT_TYPES = EVENT_TYPES;
module.exports.EVENT_STATUS = EVENT_STATUS;
module.exports.FACULTIES = FACULTIES;