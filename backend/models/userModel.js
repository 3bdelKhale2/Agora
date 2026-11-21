const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { Schema } = mongoose;

const ROLES = ['ADMIN', 'EVENTS_OFFICE', 'STUDENT', 'STAFF', 'TA', 'PROFESSOR', 'VENDOR'];
// Allow ADMIN and EVENTS_OFFICE as signupRole for admin-created accounts
const SIGNUP_ROLES = ['STUDENT', 'STAFF', 'TA', 'PROFESSOR', 'VENDOR', 'ADMIN', 'EVENTS_OFFICE'];

const isGucEmail = (email) => /@(?:student\.)?guc\.edu\.eg$/i.test(email);

const attendeeEmailValidator = {
  validator: function (v) {
    return typeof v === 'string' && v.includes('@');
  },
  message: 'Invalid email.'
};

const roleApprovalSchema = new Schema(
  {
    role: { type: String, enum: ['STAFF', 'TA', 'PROFESSOR'] },
    status: { type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'REJECTED'], default: 'NONE' },
    initiatedAt: { type: Date },
    decidedBy: { type: Schema.Types.ObjectId, ref: 'User' },
    decidedAt: { type: Date },
    note: { type: String },
  },
  { _id: false }
);

const GUC_ID_REGEX = /^\d{2}-\d{4,5}$/;

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      validate: {
        validator: function (value) {
          // Vendors and Admin/EO may use any domain
          if (this.signupRole === 'VENDOR' || this.roles?.includes('VENDOR') || this.roles?.includes('ADMIN') || this.roles?.includes('EVENTS_OFFICE')) {
            return true;
          }
          // Others must use GUC email
          return isGucEmail(value);
        },
        message: 'Email must be a GUC email unless role is Vendor/Admin/Events Office.',
      },
    },
    passwordHash: { type: String }, // set in pre('save') from the virtual "password"
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },

    // Optional for vendors; required for others (validated in controllers)
    gucId: {
      type: String,
      trim: true,
      validate: {
        validator: function (v) {
          if (!v) {
            // allow empty for vendors; non-vendors enforced as required in controllers
            return this.signupRole === 'VENDOR' || this.roles?.includes('VENDOR');
          }
          return GUC_ID_REGEX.test(v);
        },
        message:
          'GUC ID must match format "xx-xxxx" or "xx-xxxxx" (e.g., 58-1234 or 58-12345)',
      },
    },

    // For vendors
    companyName: {
      type: String,
      trim: true,
      required: function () {
        return this.signupRole === 'VENDOR' || (Array.isArray(this.roles) && this.roles.includes('VENDOR'));
      },
    },

    // What the user selected at signup. Admin/EO accounts are created by admin (no signup).
    signupRole: { type: String, enum: SIGNUP_ROLES, required: true },

    // Effective roles for authorization (assigned by admin or from signup when allowed)
    roles: [{ type: String, enum: ROLES, required: true }],

    // Email verification
    emailVerifiedAt: { type: Date }, // legacy
    isVerifiedByEmail: { type: Boolean, default: false },

    // Admin approval for Staff/TA/Professor
    roleApproval: { type: roleApprovalSchema, default: () => ({ status: 'NONE' }) },

    // Lifecycle
    active: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User' }, // admin who created Admin/EO accounts
    blockedReason: { type: String },
    // Wallet balance (monetary units in USD equivalent)
    walletBalance: { type: Number, default: 0, min: 0 },
    
  },
  { timestamps: true }
);

// Virtual for setting plain password
userSchema.virtual('password').set(function (plain) {
  this._plainPassword = plain;
});

// Pre-save: hash password if provided/changed
userSchema.pre('save', async function (next) {
  try {
    if (this._plainPassword) {
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this._plainPassword, salt);
    } else if (this.isModified('passwordHash') && typeof this.passwordHash === 'string' && !this.passwordHash.startsWith('$2')) {
      // In case a controller mistakenly sets passwordHash to a plain value
      const salt = await bcrypt.genSalt(10);
      this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
    }
    next();
  } catch (err) {
    next(err);
  }
});

userSchema.methods.comparePassword = function (candidate) {
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`.trim();
});

userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ roles: 1, active: 1 });
userSchema.index({ gucId: 1 }, { unique: true, sparse: true }); // unique when present (vendors can omit)

module.exports = mongoose.model('User', userSchema);