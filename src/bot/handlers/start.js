const Customer = require('../../models/Customer');
const { t } = require('../i18n');

const SUPPORTED_LANGS = ['fr', 'en', 'ar', 'ru', 'id', 'es'];

async function ensureCustomer(ctx) {
  const from = ctx.from;
  let customer = await Customer.findOne({ telegramId: from.id });
  if (!customer) {
    const code = from.language_code || '';
    const language = SUPPORTED_LANGS.find((l) => code.startsWith(l)) || 'en';
    customer = await Customer.create({
      telegramId: from.id,
      username: from.username,
      firstName: from.first_name,
      language,
    });
  }
  ctx.state.customer = customer;
  return customer;
}

function mainMenu(lang) {
  return {
    reply_markup: {
      inline_keyboard: [
        [{ text: t(lang, 'menu_products'), callback_data: 'menu_products' }],
        [{ text: t(lang, 'menu_balance'), callback_data: 'menu_balance' }, { text: t(lang, 'menu_deposit'), callback_data: 'menu_deposit' }],
        [{ text: t(lang, 'menu_orders'), callback_data: 'menu_orders' }],
        [{ text: t(lang, 'menu_language'), callback_data: 'menu_language' }],
      ],
    },
  };
}

function register(bot) {
  bot.start(async (ctx) => {
    const customer = await ensureCustomer(ctx);
    await ctx.reply(
      t(customer.language, 'welcome', { name: ctx.from.first_name || '' }),
      mainMenu(customer.language)
    );
  });

  bot.action('menu_main', async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.customer.language;
    await ctx.reply(t(lang, 'main_menu_title'), mainMenu(lang));
  });

  bot.command('menu', async (ctx) => {
    const lang = ctx.state.customer.language;
    await ctx.reply(t(lang, 'main_menu_title'), mainMenu(lang));
  });
}

module.exports = { register, ensureCustomer, mainMenu };
