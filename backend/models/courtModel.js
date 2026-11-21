const mongoose = require('mongoose');
const { Schema } = mongoose;

const COURT_SPORTS = ['BASKETBALL', 'TENNIS', 'FOOTBALL'];

const courtSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    sport: { type: String, enum: COURT_SPORTS, required: true, index: true },
    location: { type: String }, // e.g., Campus zone/coordinates
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

courtSchema.index({ name: 1, sport: 1 }, { unique: true });

module.exports = mongoose.model('Court', courtSchema);