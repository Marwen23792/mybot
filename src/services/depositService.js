const Deposit = require('../models/Deposit');
const Customer = require('../models/Customer');

// Crédite le solde du client une fois le paiement confirmé (idempotent grâce
// à l'unicité de Deposit.txId et au filtre de statut).
async function applyDeposit(depositId, txId) {
  const deposit = await Deposit.findOneAndUpdate(
    { _id: depositId, status: { $in: ['pending', 'processing'] } },
    { $set: { status: 'processing', txId } },
    { new: true }
  );
  if (!deposit) {
    throw new Error('Dépôt introuvable ou déjà traité');
  }

  await Customer.updateOne({ _id: deposit.customerId }, { $inc: { balance: deposit.amount } });

  deposit.status = 'completed';
  deposit.completedAt = new Date();
  await deposit.save();

  return deposit;
}

module.exports = { applyDeposit };
