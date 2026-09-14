const { Telegraf } = require('telegraf');
const { t } = require('./i18n');

const startHandler = require('./handlers/start');
const productsHandler = require('./handlers/products');
const depositHandler = require('./handlers/deposit');
const ordersHandler = require('./handlers/orders');
const profileHandler = require('./handlers/profile');
const languageHandler = require('./handlers/language');

function startBot() {
  const token = process.env.BOT_TOKEN;
  if (!token) {
    console.warn('[bot] BOT_TOKEN manquant, le bot Telegram ne démarre pas');
    return null;
  }

  const bot = new Telegraf(token);

  // Charge/crée le client et bloque l'accès si banni, sur chaque mise à jour.
  bot.use(async (ctx, next) => {
    if (!ctx.from) return next();
    const customer = await startHandler.ensureCustomer(ctx);
    if (customer.isBlocked) {
      return ctx.reply(t(customer.language, 'blocked'));
    }
    return next();
  });

  startHandler.register(bot);
  depositHandler.register(bot);
  productsHandler.register(bot);
  ordersHandler.register(bot);
  profileHandler.register(bot);
  languageHandler.register(bot);

  bot.catch((err, ctx) => {
    console.error('[bot] erreur', err);
    const lang = ctx.state?.customer?.language || 'en';
    ctx.reply(t(lang, 'error_generic')).catch(() => {});
  });

  bot.telegram.setMyCommands([
    { command: 'start', description: 'Démarrer / créer mon compte' },
    { command: 'menu', description: 'Afficher le menu principal' },
    { command: 'produits', description: 'Voir les produits disponibles' },
    { command: 'solde', description: 'Voir mon solde' },
    { command: 'commandes', description: 'Voir mes dernières commandes' },
    { command: 'depot', description: 'Déposer des fonds' },
    { command: 'langue', description: 'Changer de langue / Change language' },
  ]).catch((err) => console.error('[bot] setMyCommands a échoué', err));

  bot.launch();
  console.log('[bot] démarré');

  process.once('SIGINT', () => bot.stop('SIGINT'));
  process.once('SIGTERM', () => bot.stop('SIGTERM'));

  return bot;
}

module.exports = { startBot };
