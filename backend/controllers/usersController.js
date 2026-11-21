const mongoose = require('mongoose');
const User = require('../models/userModel');
const { generateEmailVerificationToken, sendVerificationEmail } = require('../utils/mailer');

function sanitizeUser(u) {
  const obj = u.toObject ? u.toObject() : u;
  const { passwordHash, __v, ...rest } = obj;
  return rest;
}

exports.getMe = async (req, res, next) => {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    return res.json(sanitizeUser(user));
  } catch (e) { next(e); }
};

exports.listUsers = async (req, res, next) => {
  try {
    const { page = '1', limit = '20', q } = req.query || {};
    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);

    const filter = {};
    if (q && String(q).trim()) {
      const s = String(q).trim();
      filter.$or = [
        { email: new RegExp(s, 'i') },
        { firstName: new RegExp(s, 'i') },
        { lastName: new RegExp(s, 'i') },
        { gucId: new RegExp(s, 'i') },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip((p - 1) * l)
        .limit(l)
        .lean(),
      User.countDocuments(filter),
    ]);

    return res.json({
      data: items.map((u) => ({
        _id: u._id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        gucId: u.gucId || null,
        companyName: u.companyName || null,
        roles: u.roles,
        signupRole: u.signupRole,
        active: u.active,
        blockedReason: u.blockedReason || null,
        emailVerifiedAt: u.emailVerifiedAt || null,
        isVerifiedByEmail: !!u.isVerifiedByEmail,
        roleApproval: u.roleApproval || null,
        createdAt: u.createdAt,
      })),
      meta: { page: p, limit: l, total, pages: Math.ceil(total / l) || 1 },
    });
  } catch (e) { next(e); }
};

exports.createAdminOrEO = async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role } = req.body || {};
    if (!email || !password || !firstName || !lastName || !role) {
      return res.status(400).json({ error: 'email, password, firstName, lastName, role are required' });
    }
    const roleUpper = String(role).toUpperCase();
    if (!['ADMIN', 'EVENTS_OFFICE'].includes(roleUpper)) {
      return res.status(400).json({ error: 'role must be ADMIN or EVENTS_OFFICE' });
    }

    // Enforce: Only allow creating ADMIN accounts with @guc.edu.eg emails
    const normalizedEmail = String(email).toLowerCase().trim();
    if (roleUpper === 'ADMIN' && !normalizedEmail.endsWith('@guc.edu.eg')) {
      return res.status(400).json({ error: 'ADMIN email must end with @guc.edu.eg' });
    }

    const user = new User({
      email: normalizedEmail,
      firstName: String(firstName).trim(),
      lastName: String(lastName).trim(),
      signupRole: roleUpper, // reflect true origin
      roles: [roleUpper],
      active: true,
      createdBy: req.user?.id || undefined,
      emailVerifiedAt: new Date(), // Admin-created accounts are active immediately
      isVerifiedByEmail: true,
    });
    user.password = password;
    await user.save();

    return res.status(201).json({ user: sanitizeUser(user) });
  } catch (e) { next(e); }
};

exports.deleteAdminOrEO = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid user id' });
    if (String(id) === String(req.user?.id)) return res.status(400).json({ error: 'Cannot delete yourself' });

    const u = await User.findById(id);
    if (!u) return res.status(404).json({ error: 'User not found' });

    const isAdminOrEO = (u.roles || []).some((r) => ['ADMIN', 'EVENTS_OFFICE'].includes(r));
    if (!isAdminOrEO) return res.status(400).json({ error: 'Target is not an Admin/Events Office' });

    await User.deleteOne({ _id: id });
    return res.status(204).send();
  } catch (e) { next(e); }
};

exports.assignRoles = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    const { role } = req.body || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid user id' });
    const roleUpper = String(role || '').trim().toUpperCase();
    if (!['STAFF', 'TA', 'PROFESSOR'].includes(roleUpper)) {
      return res.status(400).json({ error: 'role must be one of STAFF, TA, PROFESSOR' });
    }
    const u = await User.findById(id);
    if (!u) return res.status(404).json({ error: 'User not found' });

    // Enforce: admin cannot change requested role
    const requested = u.roleApproval?.role;
    if (!requested || requested !== roleUpper) {
      return res.status(400).json({ error: 'Admin cannot change requested role. Accept or reject the pending request.' });
    }

    if (!u.roles.includes(roleUpper)) u.roles.push(roleUpper);

    u.roleApproval = {
      role: roleUpper,
      status: 'APPROVED',
      initiatedAt: u.roleApproval?.initiatedAt || new Date(),
      decidedBy: req.user?.id,
      decidedAt: new Date(),
      note: 'Approved by Admin',
    };

    const token = await generateEmailVerificationToken(u._id);
    await u.save();
    await sendVerificationEmail(u, token);

    return res.json({ user: sanitizeUser(u) });
  } catch (e) { next(e); }
};

exports.triggerRoleVerification = async (req, res, next) => {
  try {
    const { id } = req.params || {};
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid user id' });
    const u = await User.findById(id);
    if (!u) return res.status(404).json({ error: 'User not found' });

    const token = await generateEmailVerificationToken(u._id, u.roleApproval?.role || null);
    await sendVerificationEmail(u, token);
    return res.json({ ok: true });
  } catch (e) { next(e); }
};

exports.verifyUserApproval = async (req, res, next) => {
  try {
    const { id } = req.params || {}
    const { action, note } = req.body || {}
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid user id' })
    const act = String(action || '').toLowerCase()
    if (!['accept', 'reject'].includes(act)) return res.status(400).json({ error: "action must be 'accept' or 'reject'" })

    const u = await User.findById(id)
    if (!u) return res.status(404).json({ error: 'User not found' })

    const current = u.roleApproval || { status: 'NONE' }
    const requestedRole = current.role

    if (act === 'accept') {
      if (!requestedRole) return res.status(400).json({ error: 'No requested role to approve.' })
      if (!u.roles.includes(requestedRole)) {
        u.roles.push(requestedRole)
      }
      u.roleApproval = {
        ...current,
        status: 'APPROVED',
        decidedBy: req.user?.id,
        decidedAt: new Date(),
        note: note || 'Approved by Admin',
      }
      // Send verification email to complete email verification
      const token = await generateEmailVerificationToken(u._id)
      await u.save()
      await sendVerificationEmail(u, token)
    } else {
      u.roleApproval = {
        ...current,
        status: 'REJECTED',
        decidedBy: req.user?.id,
        decidedAt: new Date(),
        note: note || 'Rejected by Admin',
      }
      await u.save()
    }

    return res.json({ user: sanitizeUser(u) })
  } catch (e) { next(e) }
}

exports.verifyEmailShortcut = async (req, res, next) => {
  try {
    const { id } = req.params || {}
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ error: 'Invalid user id' })
    const u = await User.findById(id)
    if (!u) return res.status(404).json({ error: 'User not found' })

    if (!u.isVerifiedByEmail) {
      u.isVerifiedByEmail = true
      u.emailVerifiedAt = new Date()
      await u.save()
    }
    return res.json({ user: sanitizeUser(u) })
  } catch (e) { next(e) }
}