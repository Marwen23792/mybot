const Customer = require('../models/Customer');
const Order = require('../models/Order');
const Deposit = require('../models/Deposit');
const prodsellerApi = require('../services/prodsellerApi');

async function getStats(req, res, next) {
  try {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const [
      totalCustomers,
      totalOrders,
      ordersToday,
      pendingDeposits,
      revenueAgg,
      recentOrders,
    ] = await Promise.all([
      Customer.countDocuments(),
      Order.countDocuments({ status: 'delivered' }),
      Order.countDocuments({ status: 'delivered', createdAt: { $gte: startOfToday } }),
      Deposit.countDocuments({ status: 'pending' }),
      Order.aggregate([
        { $match: { status: 'delivered' } },
        { $group: { _id: null, revenue: { $sum: '$amount' }, profit: { $sum: '$profit' } } },
      ]),
      Order.find().sort({ createdAt: -1 }).limit(5).populate('customerId', 'username telegramId'),
    ]);

    let prodsellerBalance = null;
    try {
      const balance = await prodsellerApi.getBalance();
      prodsellerBalance = balance.balance;
    } catch {
      prodsellerBalance = null; // clé API pas encore configurée
    }

    res.json({
      totalCustomers,
      totalOrders,
      ordersToday,
      pendingDeposits,
      totalRevenue: revenueAgg[0]?.revenue || 0,
      totalProfit: revenueAgg[0]?.profit || 0,
      prodsellerBalance,
      recentOrders: recentOrders.map((o) => ({
        id: o._id,
        customer: o.customerId?.username || o.customerId?.telegramId || 'N/A',
        productName: o.productName,
        amount: o.amount,
        status: o.status,
        createdAt: o.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getStats };
