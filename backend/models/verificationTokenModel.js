const mongoose = require('mongoose');
const { Schema } = mongoose;

const verificationTokenSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    role: { type: String, enum: ['STAFF', 'TA', 'PROFESSOR'] }, // for role verification when applicable
    token: { type: String, required: true, index: true },
    purpose: { type: String, enum: ['EMAIL_VERIFY', 'ROLE_VERIFY', 'PASSWORD_RESET'], required: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date },
  },
  { timestamps: true }
);

verificationTokenSchema.index({ user: 1, purpose: 1, role: 1 });

module.exports = mongoose.model('VerificationToken', verificationTokenSchema);