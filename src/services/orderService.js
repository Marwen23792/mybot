const Customer = require('../models/Customer');
const Product = require('../models/Product');
const Order = require('../models/Order');
const prodsellerApi = require('./prodsellerApi');
const binancePay = require('./binancePay');

// Achat d'un produit par un client final : débite son solde local, puis
// commande auprès de l'API ProdSeller (payée depuis le solde du compte
// revendeur). En cas d'échec en amont, le client est intégralement remboursé.
async function purchaseProduct({ customerId, productId, quantity = 1 }) {
  const [customer, product] = await Promise.all([
    Customer.findById(customerId),
    Product.findById(productId),
  ]);

  if (!customer || customer.isBlocked) throw new Error('Compte introuvable ou bloqué');
  if (!product || !product.active || !product.inStock) throw new Error('Produit indisponible');

  const amount = Math.round(product.resalePrice * quantity * 100) / 100;

  const order = await Order.create({
    customerId: customer._id,
    productId: product._id,
    productName: product.name,
    quantity,
    unitCost: product.costPrice,
    unitPrice: product.resalePrice,
    amount,
    status: 'pending',
  });
  order.idempotencyKey = String(order._id);
  await order.save();

  const debited = await Customer.findOneAndUpdate(
    { _id: customer._id, balance: { $gte: amount } },
    { $inc: { balance: -amount } },
    { new: true }
  );

  if (!debited) {
    order.status = 'failed';
    order.failReason = 'Solde insuffisant';
    await order.save();
    throw new Error('Solde insuffisant');
  }

  try {
    const upstream = await prodsellerApi.createOrder({
      productId: product.upstreamId,
      quantity,
      idempotencyKey: order.idempotencyKey,
    });

    order.status = upstream.status === 'delivered' ? 'delivered' : 'pending';
    order.upstreamOrderId = upstream.orderId;
    order.deliveredKey = upstream.deliveredKey;
    order.deliveredKeys = upstream.deliveredKeys || [];
    order.profit = Math.round((amount - product.costPrice * quantity) * 100) / 100;
    await order.save();

    await Customer.updateOne(
      { _id: customer._id },
      { $inc: { totalSpent: amount, totalOrders: 1 } }
    );

    return order;
  } catch (err) {
    // Échec en amont (rupture de stock, solde revendeur insuffisant, etc.) : on rembourse le client.
    await Customer.updateOne({ _id: customer._id }, { $inc: { balance: amount } });
    order.status = 'failed';
    order.failReason = err.message;
    await order.save();
    throw new Error(`Commande échouée, vous avez été remboursé : ${err.message}`);
  }
}

// Crée une commande "en attente de paiement" pour un achat payé directement via
// Binance Pay (pas de débit de solde) : le client paie le montant exact de la
// commande, puis paymentReceivedForDirectOrder() déclenche la livraison.
async function createDirectOrder({ customerId, productId, quantity = 1 }) {
  const [customer, product] = await Promise.all([
    Customer.findById(customerId),
    Product.findById(productId),
  ]);

  if (!customer || customer.isBlocked) throw new Error('Compte introuvable ou bloqué');
  if (!product || !product.active || !product.inStock) throw new Error('Produit indisponible');

  const amount = Math.round(product.resalePrice * quantity * 100) / 100;

  const order = await Order.create({
    customerId: customer._id,
    productId: product._id,
    productName: product.name,
    quantity,
    unitCost: product.costPrice,
    unitPrice: product.resalePrice,
    amount,
    status: 'awaiting_payment',
    paymentMethod: 'binance_direct',
  });
  order.idempotencyKey = String(order._id);
  await order.save();

  return order;
}

// Passe la commande upstream chez ProdSeller une fois le paiement Binance confirmé.
async function fulfillDirectOrder(orderId) {
  const order = await Order.findById(orderId);
  if (!order || order.status !== 'awaiting_payment') {
    throw new Error('Commande introuvable ou déjà traitée');
  }
  const product = await Product.findById(order.productId);

  try {
    const upstream = await prodsellerApi.createOrder({
      productId: product.upstreamId,
      quantity: order.quantity,
      idempotencyKey: order.idempotencyKey,
    });

    order.status = upstream.status === 'delivered' ? 'delivered' : 'pending';
    order.upstreamOrderId = upstream.orderId;
    order.deliveredKey = upstream.deliveredKey;
    order.deliveredKeys = upstream.deliveredKeys || [];
    order.profit = Math.round((order.amount - product.costPrice * order.quantity) * 100) / 100;
    await order.save();

    await Customer.updateOne(
      { _id: order.customerId },
      { $inc: { totalSpent: order.amount, totalOrders: 1 } }
    );

    return order;
  } catch (err) {
    order.status = 'failed';
    order.failReason = `Paiement reçu mais commande échouée en amont : ${err.message} (remboursement manuel requis)`;
    await order.save();
    throw new Error(`Paiement reçu mais la commande a échoué (${err.message}). Contactez le support pour un remboursement.`);
  }
}

// Vérifie le paiement Binance Pay d'une commande directe puis la livre.
async function payDirectOrderWithBinance(orderId, txId) {
  const order = await Order.findById(orderId);
  if (!order) throw new Error('Commande introuvable');
  if (order.status !== 'awaiting_payment') throw new Error('Commande déjà traitée');

  const dup = await Order.findOne({ txId, _id: { $ne: order._id } });
  if (dup) throw new Error('Cette transaction a déjà été utilisée');

  order.txId = txId;
  await order.save();

  const sinceTime = order.createdAt.getTime() - 5 * 60 * 1000;
  const found = await binancePay.pollForReceivedPayment({ expectedAmount: order.amount, sinceTime });
  if (!found) {
    throw new Error("Paiement introuvable pour l'instant, réessayez dans une minute ou attendez la validation manuelle par l'admin");
  }

  return fulfillDirectOrder(order._id);
}

module.exports = { purchaseProduct, createDirectOrder, fulfillDirectOrder, payDirectOrderWithBinance };
