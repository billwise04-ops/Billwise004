const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const memberRoutes = require('./routes/members');
const loanRoutes = require('./routes/loans');
const repaymentRoutes = require('./routes/repayments');
const dashboardRoutes = require('./routes/dashboard');

const app = express();

app.use(cors({ origin: process.env.CORS_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/members', memberRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/repayments', repaymentRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Unknown route
app.use((req, res) => res.status(404).json({ error: 'Route not found.' }));

// Errors: thrown httpError(4xx) messages go to the client; anything else is a 500.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON.' });
  if (err.status && err.status < 500) return res.status(err.status).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Something went wrong on the server.' });
});

module.exports = app;
