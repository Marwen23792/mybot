const Customer = require('../../models/Customer');
const { t, LANGUAGES } = require('../i18n');
const { mainMenu } = require('./start');

async function showLanguageMenu(ctx) {
  const lang = ctx.state.customer.language;
  const buttons = Object.entries(LANGUAGES).map(([code, label]) => [
    { text: label, callback_data: `set_lang_${code}` },
  ]);
  await ctx.reply(t(lang, 'choose_language'), { reply_markup: { inline_keyboard: buttons } });
}

function register(bot) {
  bot.action('menu_language', async (ctx) => {
    await ctx.answerCbQuery();
    await showLanguageMenu(ctx);
  });
  bot.command('langue', (ctx) => showLanguageMenu(ctx));
  bot.command('language', (ctx) => showLanguageMenu(ctx));

  bot.action(/^set_lang_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.match[1];
    if (!LANGUAGES[lang]) return;

    await Customer.updateOne({ _id: ctx.state.customer._id }, { language: lang });
    ctx.state.customer.language = lang;

    await ctx.reply(t(lang, 'language_saved', { lang: LANGUAGES[lang] }));
    await ctx.reply(t(lang, 'main_menu_title'), mainMenu(lang));
  });
}

module.exports = { register, showLanguageMenu };
