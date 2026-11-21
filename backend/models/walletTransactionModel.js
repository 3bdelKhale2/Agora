const mongoose = require('mongoose');
const { Schema } = mongoose;

const walletTransactionSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: ['TOP_UP','PURCHASE','REFUND'], required: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: 'usd' },
    relatedRegistration: { type: Schema.Types.ObjectId, ref: 'Registration' },
    balanceAfter: { type: Number, required: true, min: 0 },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

walletTransactionSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('WalletTransaction', walletTransactionSchema);