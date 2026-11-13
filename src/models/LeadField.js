const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const FIELD_TYPES = ['text', 'number', 'boolean', 'date', 'select'];

// One document per dynamic field. Definitions live here; lead VALUES live in Lead.customFields.
const leadFieldSchema = new Schema(
  {
    name: { type: String, required: true, unique: true, trim: true }, // key used in customFields
    label: { type: String, required: true, trim: true },
    type: { type: String, enum: FIELD_TYPES, required: true },
    required: { type: Boolean, default: false },
    options: { type: [String], default: [] }, // only used by "select"
    order: { type: Number, default: 0 },
  },
  { timestamps: true, toJSON }
);

module.exports = model('LeadField', leadFieldSchema);
module.exports.FIELD_TYPES = FIELD_TYPES;
