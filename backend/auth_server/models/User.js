const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: { type: String, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String },
    avatar: { type: String },
    provider: { type: String, default: 'local' },
  },
  { timestamps: true },
);

module.exports = mongoose.model('User', UserSchema);
