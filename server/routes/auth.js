const express = require('express');
const jwt = require('jsonwebtoken');
const { findUserByIdentifier, verifyPassword, toPublicUser } = require('../data/users');
const { requireAuth, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

router.post('/login', (req, res) => {
  const { username, email, password } = req.body || {};
  const user = findUserByIdentifier(username || email);

  if (!verifyPassword(user, password)) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const token = jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN,
  });

  res.json({ token, user: toPublicUser(user) });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;
