const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../db');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// POST /api/auth/login   body: { email, password }
router.post('/login', asyncHandler(async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const officer = await prisma.officer.findUnique({ where: { email: String(email).trim().toLowerCase() } });
  const ok = officer && (await bcrypt.compare(String(password), officer.passwordHash));
  // Same message for "no such email" and "wrong password" so attackers can't probe which emails exist.
  if (!ok) return res.status(401).json({ error: 'Invalid email or password.' });

  const token = jwt.sign({ id: officer.id, email: officer.email }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token, officer: { id: officer.id, name: officer.name, email: officer.email } });
}));

module.exports = router;
