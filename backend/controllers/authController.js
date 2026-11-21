const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const User = require('../models/userModel');
const VerificationToken = require('../models/verificationTokenModel');
const { generatePasswordResetToken, sendPasswordResetEmail } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_TTL = process.env.JWT_TTL || '7d';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const JWT_ISSUER = process.env.JWT_ISSUER;
const JWT_AUDIENCE = process.env.JWT_AUDIENCE;

const isStudentEmail = (email) => /@student\.guc\.edu\.eg$/i.test(email);
const isStaffFacultyEmail = (email) => /@guc\.edu\.eg$/i.test(email) && !/@student\.guc\.edu\.eg$/i.test(email);

function signJwt(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      roles: user.roles,
      email: user.email,
      name: user.fullName,
    },
    JWT_SECRET,
    {
      expiresIn: JWT_TTL,
      ...(JWT_ISSUER ? { issuer: JWT_ISSUER } : {}),
      ...(JWT_AUDIENCE ? { audience: JWT_AUDIENCE } : {}),
    }
  );
}

function sanitizeUser(user) {
  const { passwordHash, __v, ...rest } = user.toObject ? user.toObject() : user;
  return rest;
}

// POST /api/auth/signup
exports.signup = async (req, res) => {
  try {
    const { email, password, firstName, lastName, gucId, signupRole, companyName } = req.body || {};

    // Basic validation
    if (!email || !password || !firstName || !lastName || !signupRole) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }
    if (!['STUDENT', 'STAFF', 'TA', 'PROFESSOR', 'VENDOR'].includes(signupRole)) {
      return res.status(400).json({ error: 'Invalid signup role.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Domain policy
    if (signupRole === 'STUDENT' && !isStudentEmail(email)) {
      return res.status(400).json({ error: 'Students must use @student.guc.edu.eg email.' });
    }
    // Require @guc.edu.eg for STAFF/TA/PROFESSOR
    if (['STAFF', 'TA', 'PROFESSOR'].includes(signupRole) && !isStaffFacultyEmail(email)) {
      return res.status(400).json({ error: 'Staff/TA/Professor must use @guc.edu.eg email.' });
    }
    // Vendors: any domain allowed

    // Per-role requirements
    if (signupRole !== 'VENDOR' && !gucId) {
      return res.status(400).json({ error: 'GUC ID is required for this role.' });
    }
    if (signupRole === 'VENDOR' && !companyName) {
      return res.status(400).json({ error: 'Company name is required for vendors.' });
    }

    // Construct user
    const user = new User({
      email: String(email).toLowerCase().trim(),
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      gucId: gucId ? String(gucId).trim() : undefined,
      signupRole,
      companyName: signupRole === 'VENDOR' ? String(companyName).trim() : undefined,
      roles: [], // will set below
      active: true,
    });

    user.password = password; // triggers pre-save hashing

    // Roles and verification per flow
    if (signupRole === 'STUDENT') {
      user.roles = ['STUDENT'];
      user.emailVerifiedAt = new Date(); // students can sign in immediately
      user.isVerifiedByEmail = true;
    } else if (signupRole === 'VENDOR') {
      user.roles = ['VENDOR'];
      user.emailVerifiedAt = new Date(); // vendors can sign in immediately
      user.isVerifiedByEmail = true;
    } else if (['STAFF', 'TA', 'PROFESSOR'].includes(signupRole)) {
      user.roles = []; // admin will assign after checking
      user.roleApproval = {
        role: signupRole,
        status: 'PENDING',
        initiatedAt: new Date(),
      };
      // emailVerifiedAt remains null until admin assigns role and user verifies via email
    }

    await user.save();

    // Response by role
    if (['STUDENT', 'VENDOR'].includes(signupRole)) {
      const token = signJwt(user);
      return res.status(201).json({ token, user: sanitizeUser(user) });
    }

    // Staff/TA/Professor: account created, pending admin verification
    return res.status(202).json({
      message:
        'Signup successful. Your account is pending role verification by Admin. You will receive a verification email after approval.',
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/login
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });
    if (!user.active) return res.status(403).json({ error: 'Account is inactive.' });

    const ok = await user.comparePassword(password);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials.' });

    // Block login until verified for staff/TA/prof flow
    const signupIsFaculty = ['STAFF', 'TA', 'PROFESSOR'].includes(user.signupRole);
    const hasFacultyRole = (user.roles || []).some((r) => ['STAFF', 'TA', 'PROFESSOR'].includes(r));
    if ((signupIsFaculty || hasFacultyRole) && !user.isVerifiedByEmail) {
      return res.status(403).json({ error: 'Please verify your email to log in.' });
    }

    const token = signJwt(user);
    return res.status(200).json({ token, user: sanitizeUser(user) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET /api/auth/verify?token=...
exports.verifyEmail = async (req, res) => {
  try {
    const { token } = req.query || {};
    if (!token) return res.status(400).json({ error: 'Missing token.' });

    const vt = await VerificationToken.findOne({ token }).populate('user');
    if (!vt) return res.status(400).json({ error: 'Invalid token.' });
    if (vt.usedAt) return res.status(400).json({ error: 'Token already used.' });
    if (new Date() > vt.expiresAt) return res.status(400).json({ error: 'Token expired.' });

    // Mark user as verified
    const user = vt.user;
    if (!user) return res.status(400).json({ error: 'Invalid token user.' });

    user.emailVerifiedAt = new Date();
    user.isVerifiedByEmail = true;
    await user.save();

    vt.usedAt = new Date();
    await vt.save();

    // Redirect to frontend login page
    return res.redirect(302, `${FRONTEND_URL}/login?verified=1`);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/logout (stateless JWT -> just 200)
exports.logout = async (_req, res) => {
  return res.status(200).json({ ok: true });
};

// Optional: alias if routes are named differently
exports.verifyRole = exports.verifyEmail;

// POST /api/auth/forgot-password { email }
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: 'Email is required.' });

    const user = await User.findOne({ email: String(email).toLowerCase().trim() });
    // Return 200 regardless to avoid email enumeration
    if (user) {
      const token = await generatePasswordResetToken(user._id);
      await sendPasswordResetEmail(user, token);
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// POST /api/auth/reset-password { token, password }
exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: 'Token and password are required.' });
    if (String(password).length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });

    const vt = await VerificationToken.findOne({ token }).populate('user');
    if (!vt) return res.status(400).json({ error: 'Invalid token.' });
    if (vt.purpose !== 'PASSWORD_RESET') return res.status(400).json({ error: 'Invalid token purpose.' });
    if (vt.usedAt) return res.status(400).json({ error: 'Token already used.' });
    if (new Date() > vt.expiresAt) return res.status(400).json({ error: 'Token expired.' });

    const user = vt.user;
    if (!user) return res.status(400).json({ error: 'Invalid token user.' });

    user.password = password; // will hash via pre-save
    await user.save();

    // mark used and invalidate other active reset tokens for this user
    vt.usedAt = new Date();
    await vt.save();
    await VerificationToken.updateMany(
      { user: user._id, purpose: 'PASSWORD_RESET', usedAt: { $exists: false }, token: { $ne: token } },
      { $set: { usedAt: new Date() } }
    );

    return res.status(200).json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};