const mongoose = require('mongoose');

const depositMethodSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  minAmount: { type: Number, default: 1 },
  instructions: { type: String, default: '' },
  enabled: { type: Boolean, default: true },
});

module.exports = mongoose.model('DepositMethod', depositMethodSchema);
