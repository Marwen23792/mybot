require('dotenv').config();
const path = require('path');
const express = require('express');

const { connectDB } = require('./config/db');
const { errorHandler } = require('./middlewares/errorHandler');
const { jwtAuth } = require('./middlewares/jwtAuth');
const { startProductSync } = require('./services/productSync');
const { startBot } = require('./bot');

const authRoutes = require('./routes/auth.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const orderRoutes = require('./routes/orders.routes');
const customerRoutes = require('./routes/customers.routes');
const depositRoutes = require('./routes/deposits.routes');

async function main() {
  await connectDB();

  const app = express();
  app.use(express.json());
  app.use(express.static(path.join(__dirname, '..', 'public')));
  app.get('/', (req, res) => res.redirect('/login.html'));

  app.use('/api/auth', authRoutes);
  app.use('/api/dashboard', jwtAuth, dashboardRoutes);
  app.use('/api/orders', jwtAuth, orderRoutes);
  app.use('/api/customers', jwtAuth, customerRoutes);
  app.use('/api/deposits', jwtAuth, depositRoutes);

  app.use(errorHandler);

  const port = process.env.PORT || 3100;
  app.listen(port, () => console.log(`[server] ProdKeys en écoute sur le port ${port}`));

  startProductSync();
  startBot();
}

main().catch((err) => {
  console.error('[server] échec du démarrage', err);
  process.exit(1);
});
