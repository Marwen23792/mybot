const jwt = require('jsonwebtoken');

function jwtAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.adminId = payload.id;
    next();
  } catch {
    return res.status(401).json({ error: 'Session invalide ou expirée' });
  }
}

module.exports = { jwtAuth };
