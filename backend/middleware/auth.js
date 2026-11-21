const jwt = require('jsonwebtoken');

const { JWT_SECRET, JWT_ISSUER, JWT_AUDIENCE } = process.env;

// ADD THIS near the top with existing requires/consts
// (it reuses the same env values as requireAuth)
function parseAuthOptional(req, _res, next) {
  const auth = req.headers && req.headers.authorization;
  const prefix = 'Bearer ';
  if (typeof auth !== 'string' || !auth.startsWith(prefix)) {
    return next(); // no token => proceed as public
  }
  const token = auth.slice(prefix.length).trim();
  if (!token) return next();

  const options = {};
  if (JWT_ISSUER) options.issuer = JWT_ISSUER;
  if (JWT_AUDIENCE) options.audience = JWT_AUDIENCE;

  try {
    const payload = jwt.verify(token, JWT_SECRET, options);
    req.user = {
      id: payload.sub,
      roles: Array.isArray(payload.roles) ? payload.roles : [],
      email: payload.email || null,
      name: payload.name || null,
      raw: payload,
    };
  } catch (_e) {
    // invalid token? treat as anonymous; don't block public access
  }
  return next();
}

// Minimal placeholders to keep routes clean; implement real JWT + roles later
function requireAuth(req, res, next) {
  // TODO: parse JWT and attach req.user
  const auth = req.headers && req.headers.authorization;

  // Strictly require Authorization: Bearer <token>
  if (typeof auth !== 'string' || auth.length === 0) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const prefix = 'Bearer ';
  if (!auth.startsWith(prefix)) {
    return res.status(401).json({ error: 'Missing token' });
  }
  const token = auth.slice(prefix.length).trim();
  if (!token) {
    return res.status(401).json({ error: 'Missing token' });
  }

  const options = {};
  if (JWT_ISSUER) options.issuer = JWT_ISSUER;
  if (JWT_AUDIENCE) options.audience = JWT_AUDIENCE;

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET, options);
  } catch (_e) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  req.user = {
    id: payload.sub,
    roles: Array.isArray(payload.roles) ? payload.roles : [],
    email: payload.email || null,
    name: payload.name || null,
    raw: payload,
  };
  return next();
}

function requireRole(...allowedRoles) {
  const allowed = [];
  for (const r of allowedRoles) {
    if (r == null) continue;
    const parts = String(r).split(',').map(s => s.trim()).filter(Boolean);
    allowed.push(...parts);
  }
  const allowedSet = new Set(allowed);

  return function (req, res, next) {
    const user = req.user;
    const roles = (user && Array.isArray(user.roles)) ? user.roles : [];
    const authorized = roles.some(role => allowedSet.has(role));
    if (!user || !authorized) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    return next();
  };
}

module.exports = { requireAuth, requireRole, parseAuthOptional };
module.exports.requireRoles = module.exports.requireRole;