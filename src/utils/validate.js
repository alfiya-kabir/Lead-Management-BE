const ApiError = require('./ApiError');
const { isObjectId } = require('./query');

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Tiny validator (kept hand-written so beginners can read it).
 * rules: { field: { type, required, nullable, email, min, max, enum } }
 * types: string | number | boolean | stringArray | objectId | object
 * partial=true -> missing fields are fine (used for PATCH).
 * Returns { errors, values } where values only has validated, cleaned fields.
 */
function validate(body, rules, { partial = false } = {}) {
  const errors = [];
  const values = {};
  const src = body && typeof body === 'object' && !Array.isArray(body) ? body : {};
  const bad = (field, message) => errors.push({ field, message });

  for (const [field, r] of Object.entries(rules)) {
    let v = src[field];
    if (v === undefined) {
      if (r.required && !partial) bad(field, `${field} is required`);
      continue;
    }
    if (v === null || v === '') {
      if (r.nullable) { values[field] = null; continue; }
      if (r.required) { bad(field, `${field} is required`); continue; }
      if (v === null) { bad(field, `${field} cannot be null`); continue; }
    }
    switch (r.type) {
      case 'string':
        if (typeof v !== 'string') { bad(field, `${field} must be a string`); continue; }
        v = v.trim();
        if (r.email && !EMAIL.test(v)) { bad(field, 'A valid email is required'); continue; }
        if (r.min && v.length < r.min) { bad(field, `${field} must be at least ${r.min} characters`); continue; }
        if (r.max && v.length > r.max) { bad(field, `${field} must be at most ${r.max} characters`); continue; }
        if (r.enum && !r.enum.includes(v)) { bad(field, `${field} must be one of: ${r.enum.join(', ')}`); continue; }
        break;
      case 'number':
        if (typeof v !== 'number' || !Number.isFinite(v)) { bad(field, `${field} must be a number`); continue; }
        if (r.min !== undefined && v < r.min) { bad(field, `${field} must be at least ${r.min}`); continue; }
        break;
      case 'boolean':
        if (typeof v !== 'boolean') { bad(field, `${field} must be true or false`); continue; }
        break;
      case 'stringArray':
        if (!Array.isArray(v) || v.some((x) => typeof x !== 'string')) { bad(field, `${field} must be an array of strings`); continue; }
        v = [...new Set(v.map((x) => x.trim()).filter(Boolean))];
        break;
      case 'objectId':
        if (!isObjectId(v)) { bad(field, `${field} must be a valid id`); continue; }
        break;
      case 'object':
        if (typeof v !== 'object' || Array.isArray(v)) { bad(field, `${field} must be an object`); continue; }
        break;
    }
    values[field] = v;
  }
  return { errors, values };
}

function failIfErrors(errors) {
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
}

module.exports = { validate, failIfErrors };
