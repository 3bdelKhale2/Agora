const mongoose = require('mongoose');
const { Schema } = mongoose;

const courtSlotSchema = new Schema(
  {
    court: { type: Schema.Types.ObjectId, ref: 'Court', required: true, index: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    isBooked: { type: Boolean, default: false },
    bookedBy: { type: Schema.Types.ObjectId, ref: 'User' }, // optional future use
  },
  { timestamps: true }
);

courtSlotSchema.index({ court: 1, startAt: 1 }, { unique: true });

module.exports = mongoose.model('CourtSlot', courtSlotSchema);