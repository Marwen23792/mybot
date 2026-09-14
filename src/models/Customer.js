const mongoose = require('mongoose');

const customerSchema = new mongoose.Schema({
  telegramId: { type: Number, required: true, unique: true },
  username: { type: String, trim: true },
  firstName: { type: String, trim: true },
  language: { type: String, default: 'fr' },
  balance: { type: Number, default: 0 },
  totalSpent: { type: Number, default: 0 },
  totalOrders: { type: Number, default: 0 },
  isBlocked: { type: Boolean, default: false },
  blockedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Customer', customerSchema);
