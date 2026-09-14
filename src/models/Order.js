const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  customerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Customer', required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, default: 1 },
  unitCost: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  amount: { type: Number, required: true },
  profit: { type: Number, default: 0 },
  status: { type: String, enum: ['awaiting_payment', 'pending', 'delivered', 'failed', 'refunded'], default: 'pending' },
  paymentMethod: { type: String, enum: ['balance', 'binance_direct'], default: 'balance' },
  txId: { type: String, unique: true, sparse: true },
  upstreamOrderId: { type: String },
  deliveredKey: { type: String },
  deliveredKeys: [{ type: String }],
  failReason: { type: String },
  idempotencyKey: { type: String, unique: true },
  createdAt: { type: Date, default: Date.now },
});

orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);
