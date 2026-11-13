const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const STATUSES = ['new', 'contacted', 'qualified', 'proposal', 'won', 'lost'];

const leadSchema = new Schema(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 100 },
    lastName: { type: String, trim: true, maxlength: 100 },
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    source: { type: String, trim: true },
    status: { type: String, enum: STATUSES, default: 'new' },
    value: { type: Number, min: 0, default: 0 },
    assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    contactId: { type: Schema.Types.ObjectId, ref: 'Contact', default: null },
    tags: { type: [String], default: [] },
    notes: { type: String, trim: true },
    customFields: { type: Schema.Types.Mixed, default: {} }, // validated against LeadField definitions
  },
  { timestamps: true, minimize: false, toJSON } // minimize:false keeps empty {} customFields
);

// Indexes for the fields we filter / sort on. Lead email is NOT unique (same person can enquire twice).
leadSchema.index({ status: 1 });
leadSchema.index({ assignedTo: 1 });
leadSchema.index({ source: 1 });
leadSchema.index({ contactId: 1 });
leadSchema.index({ email: 1 });
leadSchema.index({ createdAt: -1 });

module.exports = model('Lead', leadSchema);
module.exports.STATUSES = STATUSES;
