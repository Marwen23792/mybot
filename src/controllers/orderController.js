const Order = require('../models/Order');
const Product = require('../models/Product');

async function adminListOrders(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [orders, total] = await Promise.all([
      Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customerId', 'username telegramId'),
      Order.countDocuments(filter),
    ]);

    res.json({
      orders: orders.map((o) => ({
        id: o._id,
        customer: o.customerId?.username || o.customerId?.telegramId || 'N/A',
        productName: o.productName,
        quantity: o.quantity,
        amount: o.amount,
        profit: o.profit,
        status: o.status,
        deliveredKey: o.deliveredKey,
        failReason: o.failReason,
        createdAt: o.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function adminListProducts(req, res, next) {
  try {
    const products = await Product.find().sort({ name: 1 });
    res.json({ products });
  } catch (err) {
    next(err);
  }
}

async function adminUpdateProductPrice(req, res, next) {
  try {
    const { resalePrice, active, marginPercent } = req.body;
    const update = {};

    if (marginPercent !== undefined) {
      const pct = Number(marginPercent);
      if (isNaN(pct) || pct < 0) return res.status(400).json({ error: 'Pourcentage invalide' });
      const product = await Product.findById(req.params.id);
      if (!product) return res.status(404).json({ error: 'Produit introuvable' });
      update.marginPercent = pct;
      update.resalePrice = Math.round(product.costPrice * (1 + pct / 100) * 100) / 100;
    } else if (resalePrice !== undefined) {
      update.resalePrice = resalePrice;
    }
    if (active !== undefined) update.active = active;

    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ error: 'Produit introuvable' });
    res.json({ product });
  } catch (err) {
    next(err);
  }
}

async function adminApplyBulkMargin(req, res, next) {
  try {
    const percentage = Number(req.body.percentage);
    if (isNaN(percentage) || percentage < 0) {
      return res.status(400).json({ error: 'Pourcentage invalide' });
    }

    const products = await Product.find();
    const ops = products.map((p) => ({
      updateOne: {
        filter: { _id: p._id },
        update: {
          marginPercent: percentage,
          resalePrice: Math.round(p.costPrice * (1 + percentage / 100) * 100) / 100,
        },
      },
    }));
    if (ops.length > 0) await Product.bulkWrite(ops);

    res.json({ updated: ops.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { adminListOrders, adminListProducts, adminUpdateProductPrice, adminApplyBulkMargin };
