const User = require('../models/User');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paged } = require('../utils/response');
const { validate, failIfErrors } = require('../utils/validate');
const { str, parsePagination, parseSort, searchFilter } = require('../utils/query');

const rules = {
  name: { type: 'string', required: true, max: 100 },
  email: { type: 'string', required: true, email: true },
  password: { type: 'string', required: true, min: 8, max: 72 }, // bcrypt ignores bytes after 72
  role: { type: 'string', enum: User.ROLES },
  active: { type: 'boolean' },
};

async function findOr404(id) {
  const user = await User.findById(id);
  if (!user) throw new ApiError(404, 'User not found');
  return user;
}

exports.list = asyncHandler(async (req, res) => {
  const { page, size, skip } = parsePagination(req.query);
  const filter = {};
  const search = searchFilter(req.query.search, ['name', 'email']);
  if (search) Object.assign(filter, search);
  if (str(req.query.role)) filter.role = str(req.query.role);
  if (req.query.active === 'true' || req.query.active === 'false') filter.active = req.query.active === 'true';

  const sort = parseSort(req.query, ['name', 'email', 'role', 'createdAt']);
  const [content, total] = await Promise.all([
    User.find(filter).sort(sort).skip(skip).limit(size),
    User.countDocuments(filter),
  ]);
  return paged(res, 'Users retrieved', { content, page, size, total });
});

exports.getOne = asyncHandler(async (req, res) => ok(res, 'User retrieved', await findOr404(req.params.id)));

// This is the "register" endpoint: only admins can create accounts (plus the seed script).
exports.create = asyncHandler(async (req, res) => {
  const { errors, values } = validate(req.body, rules);
  failIfErrors(errors);
  const { password, ...rest } = values;
  const user = await User.create({ ...rest, passwordHash: await User.hashPassword(password) });
  return ok(res, 'User created', user, 201);
});

exports.update = asyncHandler(async (req, res) => {
  const { errors, values } = validate(req.body, rules, { partial: true });
  failIfErrors(errors);
  const user = await findOr404(req.params.id);

  const isSelf = user.id === req.user.id;
  if (isSelf && ((values.role && values.role !== user.role) || values.active === false)) {
    throw new ApiError(400, 'You cannot change your own role or deactivate yourself');
  }

  const { password, ...rest } = values;
  user.set(rest);
  if (password) user.passwordHash = await User.hashPassword(password);
  await user.save();
  return ok(res, 'User updated', user);
});

// Hard delete (see README). Leads assigned to the user become unassigned.
exports.remove = asyncHandler(async (req, res) => {
  const user = await findOr404(req.params.id);
  if (user.id === req.user.id) throw new ApiError(400, 'You cannot delete yourself');
  await Lead.updateMany({ assignedTo: user._id }, { $set: { assignedTo: null } });
  await user.deleteOne();
  return ok(res, 'User deleted');
});
