const Order = require('../../models/Order');
const { t } = require('../i18n');

async function showOrders(ctx) {
  const lang = ctx.state.customer.language;
  const customer = ctx.state.customer;
  const orders = await Order.find({ customerId: customer._id }).sort({ createdAt: -1 }).limit(10);

  if (orders.length === 0) {
    return ctx.reply(t(lang, 'no_orders'));
  }

  const lines = orders.map((o) => {
    const statusEmoji = { delivered: '✅', pending: '⏳', awaiting_payment: '💳', failed: '❌', refunded: '↩️' }[o.status] || '•';
    return `${statusEmoji} ${o.productName} — $${o.amount.toFixed(2)} (${new Date(o.createdAt).toLocaleDateString(lang)})`;
  });

  await ctx.reply(t(lang, 'orders_title', { list: lines.join('\n') }), { parse_mode: 'Markdown' });
}

function register(bot) {
  bot.action('menu_orders', async (ctx) => {
    await ctx.answerCbQuery();
    await showOrders(ctx);
  });
  bot.command('commandes', (ctx) => showOrders(ctx));
  bot.command('orders', (ctx) => showOrders(ctx));
}

module.exports = { register, showOrders };
