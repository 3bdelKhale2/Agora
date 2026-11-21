const mongoose = require('mongoose');
const { Schema } = mongoose;

const PARTICIPATION_KIND = ['BAZAAR', 'BOOTH_SETUP'];
const REQUEST_STATUS = ['PENDING', 'ACCEPTED', 'REJECTED'];

const attendeeSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: (v) => typeof v === 'string' && v.includes('@'),
        message: 'Invalid attendee email.',
      },
    },
  },
  { _id: false }
);

const vendorParticipationSchema = new Schema(
  {
    kind: { type: String, enum: PARTICIPATION_KIND, required: true },

    vendorProfile: { type: Schema.Types.ObjectId, ref: 'VendorProfile', required: true, index: true },

    // Link to the related event:
    // - For kind === 'BAZAAR' => bazaar Event (type BAZAAR) is required
    // - For kind === 'BOOTH_SETUP' => may be null at request time, EO can create event on acceptance
    event: { type: Schema.Types.ObjectId, ref: 'Event', index: true },

    attendees: {
      type: [attendeeSchema],
      validate: {
        validator: function (arr) {
          return Array.isArray(arr) && arr.length > 0 && arr.length <= 5;
        },
        message: 'Attendees must be between 1 and 5.',
      },
    },

    boothSize: { type: String, enum: ['2x2', '4x4'], required: true },

    // BOOTH_SETUP specifics
    durationWeeks: { type: Number, min: 1, max: 4 }, // only for BOOTH_SETUP
    mapLocationId: { type: String }, // only for BOOTH_SETUP

    status: { type: String, enum: REQUEST_STATUS, default: 'PENDING', index: true },
    reviewedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    rejectionReason: { type: String },
  },
  { timestamps: true }
);

// Avoid duplicate requests for the same vendor+event+kind
vendorParticipationSchema.index(
  { vendorProfile: 1, kind: 1, event: 1, mapLocationId: 1 },
  { unique: false }
);

module.exports = mongoose.model('VendorParticipation', vendorParticipationSchema);