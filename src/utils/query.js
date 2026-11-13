const ApiError = require('./ApiError');

const OBJECT_ID = /^[a-f\d]{24}$/i;
const isObjectId = (v) => typeof v === 'string' && OBJECT_ID.test(v);

// Query params can arrive as arrays/objects (?status[$ne]=x). Only accept plain strings.
const str = (v) => (typeof v === 'string' && v.trim() !== '' ? v.trim() : undefined);

function parsePagination(query) {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const size = Math.min(Math.max(parseInt(query.size, 10) || 20, 1), 100);
  return { page, size, skip: (page - 1) * size };
}

// Whitelist sortable fields; add _id as a tie-breaker so pages are stable.
function parseSort(query, allowed) {
  const field = allowed.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const dir = query.order === 'asc' ? 1 : -1;
  return { [field]: dir, _id: dir };
}

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function searchFilter(term, fields) {
  const t = str(term);
  if (!t) return null;
  const rx = new RegExp(escapeRegex(t), 'i');
  return { $or: fields.map((f) => ({ [f]: rx })) };
}

function requireObjectIdParam(value, field) {
  if (!isObjectId(value)) {
    throw new ApiError(400, 'Validation failed', [{ field, message: `${field} must be a valid id` }]);
  }
  return value;
}

module.exports = { isObjectId, str, parsePagination, parseSort, searchFilter, requireObjectIdParam };
