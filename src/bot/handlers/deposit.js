const DepositMethod = require('../../models/DepositMethod');
const Deposit = require('../../models/Deposit');
const binancePay = require('../../services/binancePay');
const cryptoBot = require('../../services/cryptoBot');
const depositService = require('../../services/depositService');
const { t } = require('../i18n');

// État conversationnel simple en mémoire : { [telegramId]: { step, method, depositId } }
const pendingState = new Map();

async function showDepositMenu(ctx) {
  const lang = ctx.state.customer.language;
  const methods = await DepositMethod.find({ enabled: true });

  if (methods.length === 0) {
    return ctx.reply(t(lang, 'no_deposit_methods'));
  }

  const buttons = methods.map((m) => [{ text: m.name, callback_data: `deposit_method_${m.slug}` }]);
  await ctx.reply(t(lang, 'choose_deposit_method'), { reply_markup: { inline_keyboard: buttons } });
}

function register(bot) {
  bot.action('menu_deposit', async (ctx) => {
    await ctx.answerCbQuery();
    await showDepositMenu(ctx);
  });
  bot.command('depot', (ctx) => showDepositMenu(ctx));
  bot.command('deposit', (ctx) => showDepositMenu(ctx));

  bot.action(/^deposit_method_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.customer.language;
    const method = await DepositMethod.findOne({ slug: ctx.match[1], enabled: true });
    if (!method) return ctx.reply(t(lang, 'method_unavailable'));

    pendingState.set(ctx.from.id, { step: 'amount', method: method.slug });
    await ctx.reply(t(lang, 'ask_deposit_amount', { min: method.minAmount }));
  });

  bot.on('text', async (ctx, next) => {
    const state = pendingState.get(ctx.from.id);
    if (!state) return next();

    const customer = ctx.state.customer;
    const lang = customer.language;

    if (state.step === 'amount') {
      const amount = parseFloat(ctx.message.text.replace(',', '.'));
      const method = await DepositMethod.findOne({ slug: state.method, enabled: true });
      if (!method) {
        pendingState.delete(ctx.from.id);
        return ctx.reply(t(lang, 'method_unavailable'));
      }
      if (isNaN(amount) || amount < method.minAmount) {
        return ctx.reply(t(lang, 'invalid_deposit_amount', { min: method.minAmount }));
      }

      const deposit = await Deposit.create({ customerId: customer._id, amount, method: method.slug });

      if (method.slug === 'binance_pay') {
        pendingState.set(ctx.from.id, { step: 'txid', depositId: deposit._id });
        const payId = process.env.BINANCE_PAY_ID || "(non configuré, contactez l'admin)";
        await ctx.reply(
          t(lang, 'deposit_binance_instructions', { amount, payId, instructions: method.instructions || '' }),
          { parse_mode: 'Markdown' }
        );
      } else if (method.slug === 'cryptobot') {
        pendingState.delete(ctx.from.id);
        try {
          const invoice = await cryptoBot.createInvoice({
            amount,
            description: `Dépôt ProdKeys — client ${customer.telegramId}`,
            payload: String(deposit._id),
          });
          await Deposit.updateOne({ _id: deposit._id }, { $set: { txId: String(invoice.invoice_id) } });
          const payUrl = invoice.pay_url || invoice.bot_invoice_url || invoice.mini_app_invoice_url;

          await ctx.reply(t(lang, 'cryptobot_instructions', { amount }), {
            reply_markup: {
              inline_keyboard: [
                [{ text: t(lang, 'pay_button'), url: payUrl }],
                [{ text: t(lang, 'ive_paid'), callback_data: `check_cryptobot_${deposit._id}` }],
              ],
            },
          });
        } catch (err) {
          await ctx.reply(t(lang, 'error_prefix', { message: err.message }));
        }
      } else if (method.slug === 'usdt_bep20') {
        pendingState.set(ctx.from.id, { step: 'bep20_txid', depositId: deposit._id });
        const wallet = process.env.BEP20_USDT_WALLET || "(non configuré, contactez l'admin)";
        await ctx.reply(t(lang, 'deposit_bep20_instructions', { amount, wallet }), { parse_mode: 'Markdown' });
      } else {
        pendingState.delete(ctx.from.id);
        await ctx.reply(
          t(lang, 'deposit_manual_registered', { amount, method: method.name, instructions: method.instructions || '' })
        );
      }
      return;
    }

    if (state.step === 'txid') {
      const txId = ctx.message.text.trim();
      pendingState.delete(ctx.from.id);
      await Deposit.updateOne({ _id: state.depositId }, { $set: { txId } });
      await ctx.reply(t(lang, 'verifying'));

      try {
        await binancePay.verifyDeposit(state.depositId);
        await ctx.reply(t(lang, 'deposit_confirmed'));
      } catch (err) {
        await ctx.reply(t(lang, 'deposit_waiting', { message: err.message }));
      }
      return;
    }

    // USDT BEP20 : pas de vérification on-chain automatique, juste enregistrement
    // du hash de transaction pour validation manuelle par un admin.
    if (state.step === 'bep20_txid') {
      const txId = ctx.message.text.trim();
      pendingState.delete(ctx.from.id);
      await Deposit.updateOne({ _id: state.depositId }, { $set: { txId } });
      await ctx.reply(t(lang, 'deposit_pending_manual_review'));
      return;
    }

    return next();
  });

  // Vérification à la demande d'un paiement CryptoBot (pas de webhook, on
  // interroge l'API sur clic du bouton "J'ai payé").
  bot.action(/^check_cryptobot_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.customer.language;
    const depositId = ctx.match[1];

    const deposit = await Deposit.findById(depositId);
    if (!deposit) return ctx.reply(t(lang, 'error_prefix', { message: 'Dépôt introuvable' }));
    if (deposit.status === 'completed') return ctx.reply(t(lang, 'deposit_confirmed'));

    await ctx.reply(t(lang, 'verifying'));
    try {
      const invoice = await cryptoBot.getInvoiceStatus(deposit.txId);
      if (invoice?.status === 'paid') {
        await depositService.applyDeposit(deposit._id, deposit.txId);
        await ctx.reply(t(lang, 'deposit_confirmed'));
      } else {
        await ctx.reply(t(lang, 'cryptobot_not_paid_yet'));
      }
    } catch (err) {
      await ctx.reply(t(lang, 'error_prefix', { message: err.message }));
    }
  });
}

module.exports = { register, showDepositMenu };
