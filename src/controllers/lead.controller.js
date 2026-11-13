const Lead = require('../models/Lead');
const LeadField = require('../models/LeadField');
const User = require('../models/User');
const Contact = require('../models/Contact');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paged } = require('../utils/response');
const { validate, failIfErrors } = require('../utils/validate');
const { str, parsePagination, parseSort, searchFilter, requireObjectIdParam } = require('../utils/query');
const { validateCustomFields } = require('../services/customFields');

const rules = {
  firstName: { type: 'string', required: true, max: 100 },
  lastName: { type: 'string', max: 100 },
  email: { type: 'string', email: true, nullable: true },
  phone: { type: 'string', max: 40 },
  company: { type: 'string', max: 150 },
  source: { type: 'string', max: 100 },
  status: { type: 'string', enum: Lead.STATUSES },
  value: { type: 'number', min: 0 },
  assignedTo: { type: 'objectId', nullable: true },
  contactId: { type: 'objectId', nullable: true },
  tags: { type: 'stringArray' },
  notes: { type: 'string', max: 5000 },
  customFields: { type: 'object' },
};

const populate = (q) => q.populate('assignedTo', 'name');

async function findOr404(id) {
  const lead = await populate(Lead.findById(id));
  if (!lead) throw new ApiError(404, 'Lead not found');
  return lead;
}

// Make sure referenced user/contact actually exist.
async function checkReferences(values) {
  const errors = [];
  if (values.assignedTo && !(await User.exists({ _id: values.assignedTo, active: true }))) {
    errors.push({ field: 'assignedTo', message: 'User not found or inactive' });
  }
  if (values.contactId && !(await Contact.exists({ _id: values.contactId }))) {
    errors.push({ field: 'contactId', message: 'Contact not found' });
  }
  failIfErrors(errors);
}

exports.list = asyncHandler(async (req, res) => {
  const { page, size, skip } = parsePagination(req.query);
  const filter = {};

  const search = searchFilter(req.query.search, ['firstName', 'lastName', 'email', 'company', 'phone']);
  if (search) Object.assign(filter, search);
  if (str(req.query.status)) filter.status = str(req.query.status);
  if (str(req.query.source)) filter.source = str(req.query.source);
  if (str(req.query.tag)) filter.tags = str(req.query.tag);
  if (str(req.query.contactId)) filter.contactId = requireObjectIdParam(str(req.query.contactId), 'contactId');

  const assignedTo = str(req.query.assignedTo);
  if (assignedTo === 'me') filter.assignedTo = req.user._id;
  else if (assignedTo === 'unassigned') filter.assignedTo = null;
  else if (assignedTo) filter.assignedTo = requireObjectIdParam(assignedTo, 'assignedTo');

  const sort = parseSort(req.query, ['createdAt', 'updatedAt', 'firstName', 'lastName', 'company', 'status', 'value']);
  const [content, total] = await Promise.all([
    populate(Lead.find(filter).sort(sort).skip(skip).limit(size)),
    Lead.countDocuments(filter),
  ]);
  return paged(res, 'Leads retrieved', { content, page, size, total });
});

exports.getOne = asyncHandler(async (req, res) => ok(res, 'Lead retrieved', await findOr404(req.params.id)));

exports.create = asyncHandler(async (req, res) => {
  const { errors, values } = validate(req.body, rules);
  const { customFields: rawCustom, ...data } = values;

  if (!errors.some((e) => e.field === 'customFields')) {
    const defs = await LeadField.find();
    const result = validateCustomFields(rawCustom || {}, defs);
    errors.push(...result.errors);
    data.customFields = result.values;
  }
  failIfErrors(errors);
  await checkReferences(data);

  const lead = await Lead.create(data);
  return ok(res, 'Lead created', await findOr404(lead.id), 201);
});

exports.update = asyncHandler(async (req, res) => {
  const { errors, values } = validate(req.body, rules, { partial: true });
  const { customFields: incoming, ...data } = values;
  const lead = await findOr404(req.params.id);

  // customFields in a PATCH are MERGED into existing ones; send null to clear a value.
  // They are only re-validated when the request touches them.
  if (incoming && !errors.some((e) => e.field === 'customFields')) {
    const merged = { ...lead.customFields, ...incoming };
    Object.keys(merged).forEach((k) => merged[k] === null && delete merged[k]);
    const result = validateCustomFields(merged, await LeadField.find());
    errors.push(...result.errors);
    data.customFields = result.values;
  }
  failIfErrors(errors);
  await checkReferences(data);

  lead.set(data);
  if (data.customFields) lead.markModified('customFields');
  await lead.save();
  return ok(res, 'Lead updated', await findOr404(lead.id));
});

exports.remove = asyncHandler(async (req, res) => {
  const lead = await findOr404(req.params.id);
  await lead.deleteOne();
  return ok(res, 'Lead deleted');
});
