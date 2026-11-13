const mongoose = require('mongoose');
const Lead = require('../models/Lead');
const Contact = require('../models/Contact');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');
const { ok } = require('../utils/response');
const { str, requireObjectIdParam } = require('../utils/query');

// Builds the shared lead filter from optional ?from=&to=&assignedTo= params.
function buildLeadFilter(query) {
  const filter = {};
  const errors = [];
  const range = {};

  const parseDate = (value, field) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) errors.push({ field, message: `${field} must be a valid date` });
    return d;
  };
  if (str(query.from)) range.$gte = parseDate(str(query.from), 'from');
  if (str(query.to)) {
    const to = parseDate(str(query.to), 'to');
    if (/^\d{4}-\d{2}-\d{2}$/.test(str(query.to))) to.setUTCHours(23, 59, 59, 999); // inclusive day
    range.$lte = to;
  }
  if (errors.length) throw new ApiError(400, 'Validation failed', errors);
  if (Object.keys(range).length) filter.createdAt = range;

  if (str(query.assignedTo)) {
    requireObjectIdParam(str(query.assignedTo), 'assignedTo');
    filter.assignedTo = new mongoose.Types.ObjectId(str(query.assignedTo)); // aggregate() does not auto-cast
  }
  return filter;
}

exports.summary = asyncHandler(async (req, res) => {
  const filter = buildLeadFilter(req.query);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thisMonth = { ...(filter.createdAt || {}) };
  thisMonth.$gte = filter.createdAt && filter.createdAt.$gte > monthStart ? filter.createdAt.$gte : monthStart;

  const [totalLeads, leadsThisMonth, openLeads, wonLeads, totalContacts] = await Promise.all([
    Lead.countDocuments(filter),
    Lead.countDocuments({ ...filter, createdAt: thisMonth }),
    Lead.countDocuments({ ...filter, status: { $nin: ['won', 'lost'] } }),
    Lead.countDocuments({ ...filter, status: 'won' }),
    Contact.countDocuments(), // contacts are not filtered by lead filters
  ]);
  return ok(res, 'Dashboard summary retrieved', { totalLeads, leadsThisMonth, openLeads, wonLeads, totalContacts });
});

exports.pipeline = asyncHandler(async (req, res) => {
  const filter = buildLeadFilter(req.query);
  const rows = await Lead.aggregate([
    { $match: filter },
    { $group: { _id: '$status', count: { $sum: 1 }, totalValue: { $sum: '$value' } } },
  ]);
  const byStatus = new Map(rows.map((r) => [r._id, r]));
  // Always return every status, in pipeline order, even when it has no leads.
  const stages = Lead.STATUSES.map((status) => ({
    status,
    count: byStatus.get(status)?.count || 0,
    totalValue: byStatus.get(status)?.totalValue || 0,
  }));
  return ok(res, 'Pipeline retrieved', { stages });
});
