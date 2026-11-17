/**
 * Glue between the database and the pure maths in balanceCalculator.js.
 * Loan status is always re-derived from the schedule, so it can never drift
 * out of date: "overdue" appears the day after a missed milestone.
 */
const prisma = require('../db');
const calc = require('./balanceCalculator');

const num = (v) => Number(v);

function scheduleFor(loan) {
  return calc.generateSchedule(loan.disbursementDate, loan.repaymentPeriodMonths, loan.repaymentFrequency, num(loan.totalRepayable));
}

/** Everything derived from a loan row as of `today`. */
function evaluateLoan(loan, today = new Date()) {
  const total = num(loan.totalRepayable);
  const balance = num(loan.outstandingBalance);
  const schedule = scheduleFor(loan);
  const paid = calc.fromCents(calc.toCents(total) - calc.toCents(balance));
  const status = calc.computeLoanStatus(total, balance, schedule, today);
  const expectedDue = calc.expectedDueByDate(schedule, today);
  const amountOverdue = status === 'overdue'
    ? calc.fromCents(Math.max(0, calc.toCents(expectedDue) - calc.toCents(paid)))
    : 0;
  const next = status === 'completed'
    ? null
    : schedule.find((m) => calc.toCents(m.cumulativeDue) > calc.toCents(paid));
  return {
    schedule, paid, status, expectedDue, amountOverdue,
    daysOverdue: calc.daysOverdue(total, balance, schedule, today),
    nextDue: next ? next.dueDate : null,
  };
}

/** Plain JSON for the API (Decimals become numbers, status is freshly computed). */
function presentLoan(loan, today = new Date()) {
  const ev = evaluateLoan(loan, today);
  return {
    id: loan.id,
    memberId: loan.memberId,
    memberName: loan.member ? loan.member.fullName : undefined,
    registrationNumber: loan.member ? loan.member.registrationNumber : undefined,
    amount: num(loan.amount),
    purpose: loan.purpose,
    interestRate: num(loan.interestRate),
    interestType: loan.interestType,
    disbursementDate: loan.disbursementDate,
    repaymentPeriodMonths: loan.repaymentPeriodMonths,
    repaymentFrequency: loan.repaymentFrequency,
    totalRepayable: num(loan.totalRepayable),
    outstandingBalance: num(loan.outstandingBalance),
    paid: ev.paid,
    status: ev.status,
    daysOverdue: ev.daysOverdue,
    amountOverdue: ev.amountOverdue,
    nextDue: ev.nextDue,
  };
}

/**
 * Brings the stored status column in line with the schedule.
 * Runs on startup, hourly (the "system timer" actor) and before list/dashboard reads.
 * Returns how many loans changed.
 */
async function syncLoanStatuses(db = prisma, today = new Date()) {
  const loans = await db.loan.findMany({
    where: { status: { not: 'completed' } },
    select: {
      id: true, status: true, disbursementDate: true, repaymentPeriodMonths: true,
      repaymentFrequency: true, totalRepayable: true, outstandingBalance: true,
    },
  });
  const changes = loans
    .map((l) => ({ id: l.id, from: l.status, to: evaluateLoan(l, today).status }))
    .filter((c) => c.from !== c.to);
  if (changes.length) {
    await db.$transaction(changes.map((c) => db.loan.update({ where: { id: c.id }, data: { status: c.to } })));
  }
  return changes.length;
}

module.exports = { scheduleFor, evaluateLoan, presentLoan, syncLoanStatuses };
