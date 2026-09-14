const Product = require('../../models/Product');
const orderService = require('../../services/orderService');
const { t } = require('../i18n');

// État conversationnel : { [telegramId]: { step, productId, payMethod, orderId } }
const purchaseState = new Map();

function stockSuffix(p) {
  if (!p.inStock) return '';
  return typeof p.stockCount === 'number' ? ` (${p.stockCount})` : '';
}

async function showProducts(ctx) {
  const lang = ctx.state.customer.language;
  const products = await Product.find({ active: true }).sort({ name: 1 }).limit(30);

  if (products.length === 0) {
    return ctx.reply(t(lang, 'no_products'));
  }

  const buttons = products.map((p) => [
    {
      text: `${p.inStock ? '🟢' : '🔴'} ${p.name} — $${p.resalePrice.toFixed(2)}${stockSuffix(p)}`,
      callback_data: `product_${p._id}`,
    },
  ]);
  buttons.push([{ text: t(lang, 'back_menu'), callback_data: 'menu_main' }]);

  await ctx.reply(t(lang, 'products_list_title'), { reply_markup: { inline_keyboard: buttons } });
}

function getStockLine(product, lang) {
  if (!product.inStock) return t(lang, 'stock_out');
  if (typeof product.stockCount === 'number') return t(lang, 'stock_count', { count: product.stockCount });
  return t(lang, 'stock_in');
}

function register(bot) {
  bot.action('menu_products', async (ctx) => {
    await ctx.answerCbQuery();
    await showProducts(ctx);
  });
  bot.command('produits', (ctx) => showProducts(ctx));
  bot.command('products', (ctx) => showProducts(ctx));

  bot.action(/^product_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.customer.language;
    const product = await Product.findById(ctx.match[1]);
    if (!product) return ctx.reply(t(lang, 'product_not_found'));

    const stockLine = getStockLine(product, lang);
    const buyButtons = product.inStock
      ? [
          [{ text: t(lang, 'buy_balance'), callback_data: `buy_balance_${product._id}` }],
          [{ text: t(lang, 'buy_binance'), callback_data: `buy_binance_${product._id}` }],
        ]
      : [];

    await ctx.reply(
      t(lang, 'product_detail', {
        name: product.name,
        description: product.description || '',
        price: product.resalePrice.toFixed(2),
        stock: stockLine,
      }),
      {
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [...buyButtons, [{ text: t(lang, 'back'), callback_data: 'menu_products' }]],
        },
      }
    );
  });

  bot.action(/^buy_(balance|binance)_(.+)$/, async (ctx) => {
    await ctx.answerCbQuery();
    const lang = ctx.state.customer.language;
    const payMethod = ctx.match[1];
    const productId = ctx.match[2];
    const product = await Product.findById(productId);
    if (!product || !product.active || !product.inStock) {
      return ctx.reply(t(lang, 'product_unavailable'));
    }

    purchaseState.set(ctx.from.id, { step: 'quantity', productId, payMethod });
    await ctx.reply(t(lang, 'ask_quantity', { name: product.name }), { parse_mode: 'Markdown' });
  });

  bot.on('text', async (ctx, next) => {
    const state = purchaseState.get(ctx.from.id);
    if (!state) return next();

    const customer = ctx.state.customer;
    const lang = customer.language;

    if (state.step === 'quantity') {
      const quantity = parseInt(ctx.message.text.trim(), 10);
      if (isNaN(quantity) || quantity < 1 || quantity > 50) {
        return ctx.reply(t(lang, 'invalid_quantity'));
      }

      if (state.payMethod === 'balance') {
        purchaseState.delete(ctx.from.id);
        try {
          const order = await orderService.purchaseProduct({
            customerId: customer._id,
            productId: state.productId,
            quantity,
          });
          await replyOrderResult(ctx, order, lang);
        } catch (err) {
          await ctx.reply(t(lang, 'error_prefix', { message: err.message }));
        }
        return;
      }

      // Paiement direct via Binance Pay
      try {
        const order = await orderService.createDirectOrder({
          customerId: customer._id,
          productId: state.productId,
          quantity,
        });
        purchaseState.set(ctx.from.id, { step: 'binance_txid', orderId: order._id });
        const payId = process.env.BINANCE_PAY_ID || "(non configuré, contactez l'admin)";
        await ctx.reply(
          t(lang, 'binance_pay_instructions', { amount: order.amount.toFixed(2), payId }),
          { parse_mode: 'Markdown' }
        );
      } catch (err) {
        purchaseState.delete(ctx.from.id);
        await ctx.reply(t(lang, 'error_prefix', { message: err.message }));
      }
      return;
    }

    if (state.step === 'binance_txid') {
      const txId = ctx.message.text.trim();
      purchaseState.delete(ctx.from.id);
      await ctx.reply(t(lang, 'verifying'));
      try {
        const order = await orderService.payDirectOrderWithBinance(state.orderId, txId);
        await replyOrderResult(ctx, order, lang);
      } catch (err) {
        await ctx.reply(t(lang, 'waiting_prefix', { message: err.message }));
      }
      return;
    }

    return next();
  });
}

async function replyOrderResult(ctx, order, lang) {
  if (order.status === 'delivered') {
    const key = order.deliveredKeys?.length ? order.deliveredKeys.join('\n') : (order.deliveredKey || t(lang, 'manual_delivery'));
    await ctx.reply(t(lang, 'order_delivered', { key, amount: order.amount.toFixed(2) }));
  } else {
    await ctx.reply(t(lang, 'order_pending', { id: String(order._id).slice(-6) }));
  }
}

module.exports = { register, showProducts };
