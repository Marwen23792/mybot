const mongoose = require('mongoose');

const depositSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  amount: { type: Number, required: true },
  currency: { type: String, default: 'USDT' },
  method: { type: String, required: true },
  status: { type: String, enum: ['pending', 'processing', 'completed', 'rejected', 'failed'], default: 'pending' },
  txId: { type: String, unique: true, sparse: true },
  note: { type: String },
  completedAt: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Deposit', depositSchema);
