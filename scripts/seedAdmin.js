// Crée (ou met à jour le mot de passe d') un admin à partir de ADMIN_EMAIL / ADMIN_PASSWORD dans .env
// Usage : npm run seed:admin
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDB } = require('../src/config/db');
const Admin = require('../src/models/Admin');
const DepositMethod = require('../src/models/DepositMethod');

async function main() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.error('ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env');
    process.exit(1);
  }

  await connectDB();

  const passwordHash = await bcrypt.hash(password, 10);
  const admin = await Admin.findOneAndUpdate(
    { email: email.toLowerCase() },
    { email: email.toLowerCase(), passwordHash, name: 'Admin' },
    { upsert: true, new: true }
  );

  console.log(`Admin prêt : ${admin.email}`);

  await DepositMethod.findOneAndUpdate(
    { slug: 'binance_pay' },
    {
      $setOnInsert: {
        slug: 'binance_pay',
        name: 'Binance Pay',
        minAmount: 5,
        instructions: 'Envoyez le montant exact via Binance Pay puis collez votre ID de transaction.',
        enabled: true,
      },
    },
    { upsert: true }
  );
  console.log('Méthode de dépôt "binance_pay" prête.');

  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
