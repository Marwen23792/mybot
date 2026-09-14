const Customer = require('../models/Customer');

async function adminListCustomers(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filter = {};
    if (req.query.search) {
      filter.$or = [
        { username: new RegExp(req.query.search, 'i') },
        { telegramId: isNaN(req.query.search) ? -1 : Number(req.query.search) },
      ];
    }

    const [customers, total] = await Promise.all([
      Customer.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit),
      Customer.countDocuments(filter),
    ]);

    res.json({ customers, pagination: { page, limit, total, pages: Math.ceil(total / limit) } });
  } catch (err) {
    next(err);
  }
}

async function adminGetCustomer(req, res, next) {
  try {
    const customer = await Customer.findById(req.params.id);
    if (!customer) return res.status(404).json({ error: 'Client introuvable' });
    res.json({ customer });
  } catch (err) {
    next(err);
  }
}

async function adminAdjustBalance(req, res, next) {
  try {
    const { amount, reason } = req.body;
    if (typeof amount !== 'number' || amount === 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { $inc: { balance: amount } },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Client introuvable' });
    console.log(`[balance] ajustement manuel ${amount} pour ${customer._id} — raison: ${reason || 'non précisée'}`);
    res.json({ customer });
  } catch (err) {
    next(err);
  }
}

async function adminSetBlocked(req, res, next) {
  try {
    const { blocked } = req.body;
    const customer = await Customer.findByIdAndUpdate(
      req.params.id,
      { isBlocked: !!blocked, blockedAt: blocked ? new Date() : null },
      { new: true }
    );
    if (!customer) return res.status(404).json({ error: 'Client introuvable' });
    res.json({ customer });
  } catch (err) {
    next(err);
  }
}

module.exports = { adminListCustomers, adminGetCustomer, adminAdjustBalance, adminSetBlocked };
