require('dotenv').config();
const app = require('./app');
const { syncLoanStatuses } = require('./services/loanService');

if (!process.env.JWT_SECRET) {
  console.error('Missing JWT_SECRET. Copy .env.example to .env and set it.');
  process.exit(1);
}

const port = process.env.PORT || 4000;
app.listen(port, () => console.log(`AgriLedger API running on http://localhost:${port}`));

// "System timer": refresh overdue statuses on startup and then every hour.
const runSync = () =>
  syncLoanStatuses()
    .then((n) => n && console.log(`Updated ${n} loan status(es)`))
    .catch((err) => console.error('Status sync failed:', err.message));
runSync();
setInterval(runSync, 60 * 60 * 1000);
