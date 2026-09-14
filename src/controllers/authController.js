const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!admin) return res.status(401).json({ error: 'Identifiants invalides' });

    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });

    const token = jwt.sign({ id: admin._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });

    res.json({ token, admin: { id: admin._id, email: admin.email, name: admin.name } });
  } catch (err) {
    next(err);
  }
}

async function me(req, res, next) {
  try {
    const admin = await Admin.findById(req.adminId);
    if (!admin) return res.status(401).json({ error: 'Non authentifié' });
    res.json({ id: admin._id, email: admin.email, name: admin.name });
  } catch (err) {
    next(err);
  }
}

module.exports = { login, me };
