const mongoose = require('mongoose');
const { Schema } = mongoose;

const attemptSchema = new Schema(
  {
    registration: { type: Schema.Types.ObjectId, ref: 'Registration', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    method: { type: String, enum: ['WALLET','STRIPE','MIXED'], required: true },
    walletAmount: { type: Number, min: 0 },
    stripeAmount: { type: Number, min: 0 },
    status: { type: String, enum: ['INITIATED','SUCCEEDED','FAILED'], default: 'INITIATED', index: true },
    stripePaymentIntentId: { type: String },
    error: { type: String },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

attemptSchema.index({ registration: 1, createdAt: -1 });

module.exports = mongoose.model('PaymentAttempt', attemptSchema);