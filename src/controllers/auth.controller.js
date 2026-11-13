const jwt = require('jsonwebtoken');
const { env } = require('../config/env');
const User = require('../models/User');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { validate, failIfErrors } = require('../utils/validate');

exports.login = asyncHandler(async (req, res) => {
  const { errors, values } = validate(req.body, {
    email: { type: 'string', required: true, email: true },
    password: { type: 'string', required: true },
  });
  failIfErrors(errors);

  const user = await User.findOne({ email: values.email.toLowerCase() }).select('+passwordHash');
  // Same message for "no such user" and "wrong password" so emails can't be probed.
  if (!user || !user.active || !(await user.verifyPassword(values.password))) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
  return ok(res, 'Login successful', { token, user });
});

exports.me = asyncHandler(async (req, res) => ok(res, 'Current user retrieved', req.user));
