# ProdKeys

Dashboard revendeur + bot Telegram qui consomment l'API publique ProdSeller (`https://prodseller.com/v1`).

Un seul process Node.js :
- API + dashboard admin (HTML/CSS/JS statique, pas de build)
- Bot Telegram (Telegraf), branché sur la même base MongoDB
- Synchronisation périodique du catalogue produits depuis ProdSeller

## Installation sur le VPS

```bash
cd ProdKeys
npm install
cp .env.example .env
# éditer .env : MONGO_URI, JWT_SECRET, BOT_TOKEN, PRODSELLER_API_KEY, clés Binance...
npm run seed:admin   # crée le premier compte admin à partir de ADMIN_EMAIL/ADMIN_PASSWORD dans .env
npm start
```

Le serveur écoute sur `PORT` (3100 par défaut). Dashboard accessible sur `http://votre-ip:PORT/login.html`.

Pour le laisser tourner en permanence, utilisez pm2 :

```bash
npm install -g pm2
pm2 start src/server.js --name prodkeys
pm2 save
```

## Variables d'environnement

Voir `.env.example`. Tant que `PRODSELLER_API_KEY` n'est pas renseignée, le serveur démarre normalement mais la synchronisation des produits est désactivée (log d'avertissement, pas de crash). Idem pour les clés Binance Pay : les dépôts restent en attente de validation manuelle par l'admin dans le dashboard tant qu'elles ne sont pas configurées.

## Fonctionnement

1. **Sync produits** : toutes les 5 minutes, le catalogue de `GET /v1/products` est mis en cache local. Le prix de revente (`resalePrice`) se règle dans le dashboard (onglet **Commandes & produits**) — c'est la marge de votre ami.
2. **Achat d'un client** (via le bot) : débite le solde local du client, appelle `POST /v1/orders` sur ProdSeller (payé depuis le solde du compte revendeur), livre la clé. En cas d'échec côté ProdSeller, le client est remboursé automatiquement.
3. **Dépôt d'un client** : le bot guide le client (montant, méthode). Pour Binance Pay, il propose de coller l'ID de transaction ; le serveur tente une vérification automatique (nécessite `BINANCE_API_KEY`/`BINANCE_SECRET_KEY`), sinon le dépôt reste en attente pour validation manuelle dans l'onglet **Dépôts** du dashboard.
