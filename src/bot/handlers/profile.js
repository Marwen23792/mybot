const { t } = require('../i18n');

async function showBalance(ctx) {
  const lang = ctx.state.customer.language;
  const customer = ctx.state.customer;
  await ctx.reply(
    t(lang, 'profile_title', {
      balance: customer.balance.toFixed(2),
      totalSpent: customer.totalSpent.toFixed(2),
      totalOrders: customer.totalOrders,
    }),
    { parse_mode: 'Markdown' }
  );
}

function register(bot) {
  bot.action('menu_balance', async (ctx) => {
    await ctx.answerCbQuery();
    await showBalance(ctx);
  });
  bot.command('solde', (ctx) => showBalance(ctx));
  bot.command('balance', (ctx) => showBalance(ctx));
}

module.exports = { register, showBalance };
