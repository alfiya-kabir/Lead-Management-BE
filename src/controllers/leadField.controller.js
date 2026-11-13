const LeadField = require('../models/LeadField');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { validate } = require('../utils/validate');

const rules = {
  name: { type: 'string', required: true, max: 50 },
  label: { type: 'string', required: true, max: 100 },
  type: { type: 'string', required: true, enum: LeadField.FIELD_TYPES },
  required: { type: 'boolean' },
  options: { type: 'stringArray' },
};

exports.get = asyncHandler(async (req, res) =>
  ok(res, 'Lead fields retrieved', { fields: await LeadField.find().sort({ order: 1 }) })
);

// PUT replaces the WHOLE field list (simple "save form config" semantics).
exports.replace = asyncHandler(async (req, res) => {
  const input = req.body && req.body.fields;
  if (!Array.isArray(input) || input.length > 50) {
    throw new ApiError(400, 'Validation failed', [{ field: 'fields', message: 'fields must be an array (max 50 items)' }]);
  }

  const errors = [];
  const cleaned = [];
  const seen = new Set();
  input.forEach((item, i) => {
    const result = validate(item, rules);
    result.errors.forEach((e) => errors.push({ field: `fields[${i}].${e.field}`, message: e.message }));
    const v = result.values;
    if (v.name && !/^[a-zA-Z][a-zA-Z0-9]*$/.test(v.name)) {
      errors.push({ field: `fields[${i}].name`, message: 'name must be camelCase letters/digits, starting with a letter' });
    }
    if (v.name && seen.has(v.name)) errors.push({ field: `fields[${i}].name`, message: 'Duplicate field name' });
    seen.add(v.name);
    if (v.type === 'select' && (!v.options || v.options.length === 0)) {
      errors.push({ field: `fields[${i}].options`, message: 'Select fields need at least one option' });
    }
    cleaned.push({ ...v, options: v.type === 'select' ? v.options : [], order: i });
  });
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);

  // Not atomic (no transaction) - acceptable for an MVP, documented in README.
  await LeadField.deleteMany({});
  await LeadField.insertMany(cleaned);
  return ok(res, 'Lead fields saved', { fields: await LeadField.find().sort({ order: 1 }) });
});
