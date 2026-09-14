const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  upstreamId: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  imageUrl: { type: String, default: '' },
  costPrice: { type: Number, required: true },
  resalePrice: { type: Number, required: true },
  marginPercent: { type: Number, default: null },
  deliveryType: { type: String, default: 'instant' },
  inStock: { type: Boolean, default: true },
  stockCount: { type: Number, default: null },
  active: { type: Boolean, default: true },
  lastSyncedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Product', productSchema);
