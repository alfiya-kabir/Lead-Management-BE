const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Verifies the Bearer token and loads the user fresh (so deactivated users lose access).
const authenticate = asyncHandler(async (req, res, next) => {
  const [scheme, token] = (req.headers.authorization || '').split(' ');
  if (scheme !== 'Bearer' || !token) throw new ApiError(401, 'Authentication required');

  let payload;
  try {
    payload = jwt.verify(token, env.jwtSecret);
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }
  const user = await User.findById(payload.sub);
  if (!user || !user.active) throw new ApiError(401, 'Invalid or expired token');
  req.user = user;
  next();
});

// Usage: authorize('admin') or authorize('admin', 'manager')
const authorize = (...roles) => (req, res, next) =>
  roles.includes(req.user.role)
    ? next()
    : next(new ApiError(403, 'You do not have permission to perform this action'));

module.exports = { authenticate, authorize };
