const express = require('express');
const prisma = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/auth');
const httpError = require('../utils/httpError');
const calc = require('../services/balanceCalculator');
const { evaluateLoan, syncLoanStatuses } = require('../services/loanService');

const router = express.Router();
router.use(requireAuth);

// GET /api/dashboard/summary?from=2026-01-01&to=2026-06-30  (from/to only affect totalDisbursed)
router.get('/summary', asyncHandler(async (req, res) => {
  await syncLoanStatuses();
  const today = new Date();

  const from = req.query.from ? new Date(req.query.from) : null;
  const to = req.query.to ? new Date(req.query.to) : null;
  if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime()))) throw httpError(400, 'from/to must be valid dates.');
  if (to) to.setUTCHours(23, 59, 59, 999);

  const loans = await prisma.loan.findMany();
  const rows = loans.map((loan) => ({ loan, ev: evaluateLoan(loan, today) }));

  const inRange = loans.filter((l) => (!from || l.disbursementDate >= from) && (!to || l.disbursementDate <= to));

  // Repayment rate = money received towards milestones already due / money that should have been received by now.
  let due = 0;
  let onTime = 0;
  for (const { ev } of rows) {
    due += calc.toCents(ev.expectedDue);
    onTime += Math.min(calc.toCents(ev.paid), calc.toCents(ev.expectedDue));
  }

  // Repayments received per month for the last 6 months (UTC).
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - i, 1));
    months.push({
      key: `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`,
      label: d.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' }),
      cents: 0,
    });
  }
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - 5, 1));
  const repayments = await prisma.repayment.findMany({ where: { paymentDate: { gte: start } }, select: { amount: true, paymentDate: true } });
  for (const r of repayments) {
    const key = `${r.paymentDate.getUTCFullYear()}-${String(r.paymentDate.getUTCMonth() + 1).padStart(2, '0')}`;
    const bucket = months.find((m) => m.key === key);
    if (bucket) bucket.cents += calc.toCents(r.amount);
  }

  res.json({
    totalDisbursed: calc.sumMoney(inRange.map((l) => l.amount)),
    totalDisbursedAllTime: calc.sumMoney(loans.map((l) => l.amount)),
    totalOutstanding: calc.sumMoney(rows.filter((r) => r.ev.status !== 'completed').map((r) => r.loan.outstandingBalance)),
    repaymentRate: due > 0 ? Math.round((onTime / due) * 1000) / 10 : null,
    totalMembers: await prisma.member.count(),
    activeLoans: rows.filter((r) => r.ev.status === 'active').length,
    overdueLoans: rows.filter((r) => r.ev.status === 'overdue').length,
    completedLoans: rows.filter((r) => r.ev.status === 'completed').length,
    monthlyRepayments: months.map((m) => ({ key: m.key, label: m.label, total: calc.fromCents(m.cents) })),
  });
}));

// GET /api/dashboard/overdue  -> overdue loans, worst first
router.get('/overdue', asyncHandler(async (req, res) => {
  await syncLoanStatuses();
  const loans = await prisma.loan.findMany({ where: { status: 'overdue' }, include: { member: true } });
  const list = loans.map((loan) => {
    const ev = evaluateLoan(loan);
    return {
      loanId: loan.id, memberId: loan.memberId, memberName: loan.member.fullName,
      registrationNumber: loan.member.registrationNumber, daysOverdue: ev.daysOverdue,
      amountOverdue: ev.amountOverdue, outstandingBalance: Number(loan.outstandingBalance),
    };
  });
  list.sort((a, b) => b.daysOverdue - a.daysOverdue);
  res.json(list);
}));

module.exports = router;
