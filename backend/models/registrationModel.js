const mongoose = require('mongoose');
const { Schema } = mongoose;

const REG_STATUS = ['PENDING', 'REGISTERED', 'CANCELLED'];
const PAYMENT_STATUS = ['UNPAID','PENDING','PAID','FAILED','REFUNDED'];
const PAYMENT_METHODS = ['NONE','WALLET','STRIPE','MIXED'];

const registrationSchema = new Schema(
  {
    event: { type: Schema.Types.ObjectId, ref: 'Event', required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    status: { type: String, enum: REG_STATUS, default: 'REGISTERED' },
    cancelledAt: { type: Date },

    // Payment fields
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: 'UNPAID', index: true },
    paymentMethod: { type: String, enum: PAYMENT_METHODS, default: 'NONE' },
    amountPaid: { type: Number, min: 0 },
    currency: { type: String, default: 'usd' },
    priceSnapshot: { type: Number, min: 0 }, // capture price at time of payment initiation
    walletDeducted: { type: Number, min: 0 },
    stripeCheckoutSessionId: { type: String },
    stripePaymentIntentId: { type: String },
    mixedPaymentIntentId: { type: String }, // payment intent when wallet partial used
    paymentAttempts: [{ type: Schema.Types.ObjectId, ref: 'PaymentAttempt' }],

    // Receipt tracking
    receiptSentAt: { type: Date },
    lastReceiptError: { type: String },

    // Registration confirmation email tracking
    confirmationSentAt: { type: Date },
    lastConfirmationError: { type: String },

    // Snapshot for requirements (name, mail, student/staff id at time of registration)
    snapshot: {
      name: String,
      email: String,
      gucId: String,
    },

  },
  { timestamps: true }
);

// One seat per user per event
registrationSchema.index({ event: 1, user: 1 }, { unique: true });

module.exports = mongoose.model('Registration', registrationSchema);
module.exports.REG_STATUS = REG_STATUS;
module.exports.PAYMENT_STATUS = PAYMENT_STATUS;
module.exports.PAYMENT_METHODS = PAYMENT_METHODS;