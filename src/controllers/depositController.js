const Deposit = require('../models/Deposit');
const DepositMethod = require('../models/DepositMethod');
const Customer = require('../models/Customer');

async function adminListDeposits(req, res, next) {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 20, 100);
    const filter = {};
    if (req.query.status) filter.status = req.query.status;

    const [deposits, total] = await Promise.all([
      Deposit.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('customerId', 'username telegramId'),
      Deposit.countDocuments(filter),
    ]);

    res.json({
      deposits: deposits.map((d) => ({
        id: d._id,
        customer: d.customerId?.username || d.customerId?.telegramId || 'N/A',
        amount: d.amount,
        currency: d.currency,
        method: d.method,
        status: d.status,
        txId: d.txId,
        createdAt: d.createdAt,
      })),
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    next(err);
  }
}

async function adminApproveDeposit(req, res, next) {
  try {
    const deposit = await Deposit.findOne({ _id: req.params.id, status: { $in: ['pending', 'processing'] } });
    if (!deposit) return res.status(404).json({ error: 'Dépôt introuvable ou déjà traité' });

    const txId = req.body.txId?.trim();
    if (txId) deposit.txId = txId;

    await Customer.updateOne({ _id: deposit.customerId }, { $inc: { balance: deposit.amount } });
    deposit.status = 'completed';
    deposit.completedAt = new Date();
    await deposit.save();

    res.json({ deposit });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ error: 'Cet ID de transaction est déjà utilisé par un autre dépôt' });
    }
    next(err);
  }
}

async function adminRejectDeposit(req, res, next) {
  try {
    const deposit = await Deposit.findOneAndUpdate(
      { _id: req.params.id, status: { $in: ['pending', 'processing'] } },
      { status: 'rejected', note: req.body.reason || '' },
      { new: true }
    );
    if (!deposit) return res.status(404).json({ error: 'Dépôt introuvable ou déjà traité' });
    res.json({ deposit });
  } catch (err) {
    next(err);
  }
}

async function adminListMethods(req, res, next) {
  try {
    const methods = await DepositMethod.find().sort({ name: 1 });
    res.json({ methods });
  } catch (err) {
    next(err);
  }
}

async function adminUpsertMethod(req, res, next) {
  try {
    const { slug, name, minAmount, instructions, enabled } = req.body;
    if (!slug || !name) return res.status(400).json({ error: 'slug et name requis' });

    const method = await DepositMethod.findOneAndUpdate(
      { slug },
      { name, minAmount, instructions, enabled },
      { upsert: true, new: true }
    );
    res.json({ method });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  adminListDeposits,
  adminApproveDeposit,
  adminRejectDeposit,
  adminListMethods,
  adminUpsertMethod,
};
