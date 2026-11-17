/**
 * AgriLedger loan maths.
 *
 * Pure functions only: no database, no Express. All money is converted to
 * whole cents internally so results never suffer from floating-point errors
 * (e.g. 0.1 + 0.2). Inputs and outputs are normal numbers (KSh).
 */

const MS_PER_DAY = 24 * 60 * 60 * 1000;

const toCents = (value) => Math.round(Number(value) * 100);
const fromCents = (cents) => cents / 100;
const dayNumber = (date) => Math.floor(new Date(date).getTime() / MS_PER_DAY); // UTC calendar day

function assertPositiveNumber(value, name) {
  if (!Number.isFinite(Number(value)) || Number(value) <= 0) {
    throw new Error(`${name} must be a positive number`);
  }
}

/** Sum a list of money values without float drift. */
function sumMoney(values) {
  return fromCents(values.reduce((total, v) => total + toCents(v), 0));
}

/**
 * Total the member must repay (principal + interest).
 * - flat:             interest = principal x rate x (months / 12)
 * - reducing_balance: standard amortised monthly instalment x months
 * `annualRatePercent` is per year, e.g. 10 means 10% p.a.
 */
function calculateTotalRepayable(principal, annualRatePercent, months, interestType = 'flat') {
  assertPositiveNumber(principal, 'Principal');
  assertPositiveNumber(months, 'Repayment period');
  if (!Number.isInteger(Number(months))) throw new Error('Repayment period must be a whole number of months');
  if (!Number.isFinite(Number(annualRatePercent)) || Number(annualRatePercent) < 0) {
    throw new Error('Interest rate must be zero or more');
  }

  const p = toCents(principal);
  const rate = Number(annualRatePercent) / 100;
  const n = Number(months);

  if (interestType === 'flat') {
    return fromCents(p + Math.round(p * rate * n / 12));
  }
  if (interestType === 'reducing_balance') {
    const r = rate / 12;
    const instalment = r === 0 ? p / n : (p * r) / (1 - Math.pow(1 + r, -n));
    return fromCents(Math.round(instalment) * n);
  }
  throw new Error(`Unknown interest type: ${interestType}`);
}

/** Add whole months in UTC, clamping to month end (31 Jan + 1 month = 28 Feb). */
function addMonths(date, months) {
  const d = new Date(new Date(date).getTime());
  const day = d.getUTCDate();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, lastDay));
  return d;
}

/**
 * Expected repayment milestones.
 * Returns [{ dueDate, amountDue, cumulativeDue }]. Any rounding remainder is
 * added to the final instalment so the schedule always sums to the total.
 */
function generateSchedule(disbursementDate, months, frequency, totalRepayable) {
  assertPositiveNumber(months, 'Repayment period');
  const total = toCents(totalRepayable);

  if (frequency === 'lump_sum') {
    return [{ dueDate: addMonths(disbursementDate, months), amountDue: fromCents(total), cumulativeDue: fromCents(total) }];
  }
  if (frequency === 'monthly') {
    const base = Math.floor(total / months);
    const remainder = total - base * months;
    const schedule = [];
    let cumulative = 0;
    for (let i = 1; i <= months; i++) {
      const amount = base + (i === months ? remainder : 0);
      cumulative += amount;
      schedule.push({ dueDate: addMonths(disbursementDate, i), amountDue: fromCents(amount), cumulativeDue: fromCents(cumulative) });
    }
    return schedule;
  }
  throw new Error(`Unknown repayment frequency: ${frequency}`);
}

/**
 * Apply one repayment to a balance.
 * Rejects zero/negative amounts and overpayments (requirement FR15).
 */
function applyRepayment(outstandingBalance, amount) {
  const balance = toCents(outstandingBalance);
  const payment = toCents(amount);

  if (!Number.isFinite(payment) || payment <= 0) throw new Error('Repayment amount must be greater than zero');
  if (payment > balance) {
    throw new Error(`Repayment of ${fromCents(payment)} exceeds the outstanding balance of ${fromCents(balance)}`);
  }
  const newBalance = balance - payment;
  return { newBalance: fromCents(newBalance), status: newBalance === 0 ? 'completed' : 'active' };
}

/**
 * Work out a loan's status as of `today`.
 * - completed: nothing left to pay
 * - overdue:   a milestone date has passed and the member has paid less than
 *              the cumulative amount due by then
 * - active:    otherwise (paying ahead of schedule keeps a loan active)
 * A milestone is only "passed" on the day AFTER its due date.
 */
function computeLoanStatus(totalRepayable, outstandingBalance, schedule, today = new Date()) {
  const total = toCents(totalRepayable);
  const balance = toCents(outstandingBalance);
  if (balance <= 0) return 'completed';

  const paid = total - balance;
  const todayDay = dayNumber(today);
  const passed = schedule.filter((m) => dayNumber(m.dueDate) < todayDay);
  if (passed.length === 0) return 'active';

  const expected = toCents(passed[passed.length - 1].cumulativeDue);
  return paid < expected ? 'overdue' : 'active';
}

/** Days since the earliest unpaid milestone fell due (0 if not overdue). Used by the dashboard. */
function daysOverdue(totalRepayable, outstandingBalance, schedule, today = new Date()) {
  const paid = toCents(totalRepayable) - toCents(outstandingBalance);
  const todayDay = dayNumber(today);
  const missed = schedule.find((m) => dayNumber(m.dueDate) < todayDay && toCents(m.cumulativeDue) > paid);
  return missed ? todayDay - dayNumber(missed.dueDate) : 0;
}

/** Cumulative amount that should have been paid by `today` (0 if no milestone has passed). */
function expectedDueByDate(schedule, today = new Date()) {
  const todayDay = dayNumber(today);
  const passed = schedule.filter((m) => dayNumber(m.dueDate) < todayDay);
  return passed.length ? passed[passed.length - 1].cumulativeDue : 0;
}

/** Schedule with a state per milestone: 'paid', 'overdue' or 'upcoming'. */
function annotateSchedule(schedule, paidAmount, today = new Date()) {
  const paid = toCents(paidAmount);
  const todayDay = dayNumber(today);
  return schedule.map((m, i) => ({
    number: i + 1,
    dueDate: m.dueDate,
    amountDue: m.amountDue,
    cumulativeDue: m.cumulativeDue,
    state: paid >= toCents(m.cumulativeDue) ? 'paid' : dayNumber(m.dueDate) < todayDay ? 'overdue' : 'upcoming',
  }));
}

module.exports = {
  toCents, fromCents, sumMoney,
  calculateTotalRepayable, addMonths, generateSchedule,
  applyRepayment, computeLoanStatus, daysOverdue,
  expectedDueByDate, annotateSchedule,
};
