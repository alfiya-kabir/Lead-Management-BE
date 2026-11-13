const { Schema, model } = require('mongoose');
const bcrypt = require('bcrypt');
const toJSON = require('../utils/toJSON');

const ROLES = ['admin', 'manager', 'agent'];

const userSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false }, // never loaded by default
    role: { type: String, enum: ROLES, default: 'agent' },
    active: { type: Boolean, default: true },
  },
  { timestamps: true, toJSON }
);

userSchema.index({ name: 1 });

userSchema.statics.hashPassword = (plain) => bcrypt.hash(plain, 10);
userSchema.methods.verifyPassword = function (plain) {
  return bcrypt.compare(plain, this.passwordHash); // load the doc with .select('+passwordHash')
};

module.exports = model('User', userSchema);
module.exports.ROLES = ROLES;
