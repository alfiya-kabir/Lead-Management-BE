// Shared Mongoose toJSON transform: _id -> id, hide internals and password hash.
module.exports = {
  transform(doc, ret) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.passwordHash;
    return ret;
  },
};
