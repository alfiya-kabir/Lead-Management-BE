const { Schema, model } = require('mongoose');
const toJSON = require('../utils/toJSON');

const contactSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 150 },
    email: { type: String, lowercase: true, trim: true, default: null },
    phone: { type: String, trim: true },
    company: { type: String, trim: true },
    tags: { type: [String], default: [] },
    notes: { type: String, trim: true },
  },
  { timestamps: true, toJSON }
);

// Unique email, but only when an email is actually set (contacts may have none).
contactSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $type: 'string' } } });
contactSchema.index({ name: 1 });
contactSchema.index({ tags: 1 });

module.exports = model('Contact', contactSchema);
