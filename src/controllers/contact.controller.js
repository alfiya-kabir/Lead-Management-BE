const Contact = require('../models/Contact');
const Lead = require('../models/Lead');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok, paged } = require('../utils/response');
const { validate, failIfErrors } = require('../utils/validate');
const { str, parsePagination, parseSort, searchFilter } = require('../utils/query');

const rules = {
  name: { type: 'string', required: true, max: 150 },
  email: { type: 'string', email: true, nullable: true },
  phone: { type: 'string', max: 40 },
  company: { type: 'string', max: 150 },
  tags: { type: 'stringArray' },
  notes: { type: 'string', max: 5000 },
};

async function findOr404(id) {
  const contact = await Contact.findById(id);
  if (!contact) throw new ApiError(404, 'Contact not found');
  return contact;
}

exports.list = asyncHandler(async (req, res) => {
  const { page, size, skip } = parsePagination(req.query);
  const filter = {};
  const search = searchFilter(req.query.search, ['name', 'email', 'company', 'phone']);
  if (search) Object.assign(filter, search);
  if (str(req.query.tag)) filter.tags = str(req.query.tag);

  const sort = parseSort(req.query, ['createdAt', 'name', 'company', 'email']);
  const [content, total] = await Promise.all([
    Contact.find(filter).sort(sort).skip(skip).limit(size),
    Contact.countDocuments(filter),
  ]);
  return paged(res, 'Contacts retrieved', { content, page, size, total });
});

// A contact can have many leads (Lead.contactId points here); include a short list.
exports.getOne = asyncHandler(async (req, res) => {
  const contact = await findOr404(req.params.id);
  const leads = await Lead.find({ contactId: contact._id }).select('firstName lastName status value').sort({ createdAt: -1 });
  return ok(res, 'Contact retrieved', { ...contact.toJSON(), leads });
});

exports.create = asyncHandler(async (req, res) => {
  const { errors, values } = validate(req.body, rules);
  failIfErrors(errors);
  return ok(res, 'Contact created', await Contact.create(values), 201);
});

exports.update = asyncHandler(async (req, res) => {
  const { errors, values } = validate(req.body, rules, { partial: true });
  failIfErrors(errors);
  const contact = await findOr404(req.params.id);
  contact.set(values);
  await contact.save();
  return ok(res, 'Contact updated', contact);
});

// Hard delete; leads that pointed at this contact simply lose the link.
exports.remove = asyncHandler(async (req, res) => {
  const contact = await findOr404(req.params.id);
  await Lead.updateMany({ contactId: contact._id }, { $set: { contactId: null } });
  await contact.deleteOne();
  return ok(res, 'Contact deleted');
});
