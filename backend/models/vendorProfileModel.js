const mongoose = require('mongoose');
const { Schema } = mongoose;

const vendorProfileSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    companyName: { type: String, required: true, trim: true },
    crNumber: { type: String, trim: true }, // commercial registration
    taxId: { type: String, trim: true },
    phone: { type: String, trim: true },
    website: { type: String, trim: true },
    address: { type: String, trim: true },
    documents: [
      {
        label: String,
        url: String,
      },
    ],
  },
  { timestamps: true }
);

vendorProfileSchema.index({ companyName: 'text' });

module.exports = mongoose.model('VendorProfile', vendorProfileSchema);