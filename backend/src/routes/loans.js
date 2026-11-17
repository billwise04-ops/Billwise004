const express = require('express');
const prisma = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/auth');
const httpError = require('../utils/httpError');
const calc = require('../services/balanceCalculator');
const { evaluateLoan, presentLoan, scheduleFor, syncLoanStatuses } = require('../services/loanService');

const router = express.Router();
router.use(requireAuth);

const PURPOSES = ['seed', 'fertilizer', 'equipment', 'other'];
const INTEREST_TYPES = ['flat', 'reducing_balance'];
const FREQUENCIES = ['monthly', 'lump_sum'];
const METHODS = ['cash', 'mobile_money', 'bank'];
const STATUSES = ['active', 'completed', 'overdue'];

// ---------- helpers ----------
function parseId(value, label = 'loan') {
  const id = Number.parseInt(value, 10);
  if (!Number.isInteger(id) || id < 1) throw httpError(400, `Invalid ${label} id.`);
  return id;
}

function parseDate(value, label, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw httpError(400, `${label} is not a valid date.`);
  return date;
}

// Validates the money terms shared by "preview" and "disburse".
function readTerms(body = {}) {
  const amount = Number(body.amount);
  const interestRate = Number(body.interestRate);
  const months = Number(body.repaymentPeriodMonths);
  const interestType = body.interestType || 'flat';
  const frequency = body.repaymentFrequency || 'monthly';

  if (!(amount > 0) || amount > 100000000) throw httpError(400, 'Loan amount must be greater than zero.');
  if (!Number.isFinite(interestRate) || interestRate < 0 || interestRate > 100) throw httpError(400, 'Interest rate must be between 0 and 100.');
  if (!Number.isInteger(months) || months < 1 || months > 120) throw httpError(400, 'Repayment period must be a whole number of months (1 to 120).');
  if (!INTEREST_TYPES.includes(interestType)) throw httpError(400, 'Interest type must be flat or reducing_balance.');
  if (!FREQUENCIES.includes(frequency)) throw httpError(400, 'Repayment frequency must be monthly or lump_sum.');
  if (interestType === 'reducing_balance' && frequency === 'lump_sum') {
    throw httpError(400, 'Reducing balance interest needs monthly repayments.');
  }
  return { amount: calc.fromCents(calc.toCents(amount)), interestRate, months, interestType, frequency };
}

function totalFor(terms) {
  try {
    return calc.calculateTotalRepayable(terms.amount, terms.interestRate, terms.months, terms.interestType);
  } catch (err) {
    throw httpError(400, err.message);
  }
}

// ---------- routes ----------

// POST /api/loans/preview  -> live summary for the Disburse Loan form (nothing is saved)
router.post('/preview', asyncHandler(async (req, res) => {
  const terms = readTerms(req.body);
  const total = totalFor(terms);
  const schedule = calc.generateSchedule(new Date(), terms.months, terms.frequency, total);
  res.json({
    principal: terms.amount,
    interest: calc.fromCents(calc.toCents(total) - calc.toCents(terms.amount)),
    totalRepayable: total,
    instalments: schedule.length,
    instalment: terms.frequency === 'monthly' ? schedule[0].amountDue : null,
  });
}));

// POST /api/loans  -> disburse a loan
router.post('/', asyncHandler(async (req, res) => {
  const body = req.body || {};
  const memberId = Number.parseInt(body.memberId, 10);
  const member = Number.isInteger(memberId) ? await prisma.member.findUnique({ where: { id: memberId } }) : null;
  if (!member) throw httpError(400, 'Select a valid member.');
  if (!PURPOSES.includes(body.purpose)) throw httpError(400, 'Purpose must be seed, fertilizer, equipment or other.');

  const terms = readTerms(body);
  const total = totalFor(terms);
  const disbursementDate = parseDate(body.disbursementDate, 'Disbursement date', new Date());

  const loan = await prisma.loan.create({
    data: {
      memberId: member.id,
      officerId: req.officer.id,
      amount: terms.amount,
      purpose: body.purpose,
      interestRate: terms.interestRate,
      interestType: terms.interestType,
      disbursementDate,
      repaymentPeriodMonths: terms.months,
      repaymentFrequency: terms.frequency,
      totalRepayable: total,
      outstandingBalance: total,
      status: 'active',
    },
    include: { member: true },
  });
  res.status(201).json(presentLoan(loan));
}));

// GET /api/loans?status=overdue&memberId=3
router.get('/', asyncHandler(async (req, res) => {
  await syncLoanStatuses();
  const where = {};
  if (req.query.status) {
    if (!STATUSES.includes(req.query.status)) throw httpError(400, 'Unknown status filter.');
    where.status = req.query.status;
  }
  if (req.query.memberId) where.memberId = parseId(req.query.memberId, 'member');

  const loans = await prisma.loan.findMany({ where, orderBy: { id: 'desc' }, include: { member: true } });
  res.json(loans.map((l) => presentLoan(l)));
}));

// GET /api/loans/:id  -> detail with schedule and repayment history
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const loan = await prisma.loan.findUnique({
    where: { id },
    include: {
      member: true,
      officer: { select: { name: true } },
      repayments: { orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }], include: { officer: { select: { name: true } } } },
    },
  });
  if (!loan) throw httpError(404, 'Loan not found.');

  const view = presentLoan(loan);
  if (view.status !== loan.status) await prisma.loan.update({ where: { id }, data: { status: view.status } });

  const ev = evaluateLoan(loan);
  res.json({
    ...view,
    officerName: loan.officer.name,
    member: { id: loan.member.id, fullName: loan.member.fullName, registrationNumber: loan.member.registrationNumber, phone: loan.member.phone },
    schedule: calc.annotateSchedule(ev.schedule, ev.paid),
    repayments: loan.repayments.map((r) => ({
      id: r.id, amount: Number(r.amount), paymentDate: r.paymentDate, method: r.method,
      balanceAfter: Number(r.balanceAfter), officerName: r.officer.name,
    })),
  });
}));

// POST /api/loans/:id/repayments  -> log a repayment
router.post('/:id/repayments', asyncHandler(async (req, res) => {
  const id = parseId(req.params.id);
  const body = req.body || {};
  const amount = Number(body.amount);
  if (!(amount > 0)) throw httpError(400, 'Repayment amount must be greater than zero.');
  if (!METHODS.includes(body.method)) throw httpError(400, 'Payment method must be cash, mobile_money or bank.');

  const today = new Date();
  const paymentDate = parseDate(body.paymentDate, 'Payment date', today);
  if (paymentDate.getTime() > today.getTime() + 24 * 60 * 60 * 1000) throw httpError(400, 'Payment date cannot be in the future.');

  const result = await prisma.$transaction(async (tx) => {
    const loan = await tx.loan.findUnique({ where: { id } });
    if (!loan) throw httpError(404, 'Loan not found.');
    if (Number(loan.outstandingBalance) <= 0) throw httpError(400, 'This loan is already fully repaid.');

    let applied;
    try {
      applied = calc.applyRepayment(Number(loan.outstandingBalance), amount);
    } catch (err) {
      throw httpError(400, err.message); // e.g. overpayment
    }
    const status = calc.computeLoanStatus(Number(loan.totalRepayable), applied.newBalance, scheduleFor(loan), today);

    // Only update if nobody else changed the balance in the meantime.
    const updated = await tx.loan.updateMany({
      where: { id, outstandingBalance: loan.outstandingBalance },
      data: { outstandingBalance: applied.newBalance, status },
    });
    if (updated.count === 0) throw httpError(409, 'This loan was just changed by someone else. Please refresh and try again.');

    const repayment = await tx.repayment.create({
      data: {
        loanId: id, officerId: req.officer.id,
        amount: calc.fromCents(calc.toCents(amount)),
        paymentDate, method: body.method, balanceAfter: applied.newBalance,
      },
    });
    const fresh = await tx.loan.findUnique({ where: { id }, include: { member: true } });
    return { repayment, loan: fresh };
  });

  res.status(201).json({
    repayment: {
      id: result.repayment.id, amount: Number(result.repayment.amount), paymentDate: result.repayment.paymentDate,
      method: result.repayment.method, balanceAfter: Number(result.repayment.balanceAfter),
    },
    loan: presentLoan(result.loan),
  });
}));

module.exports = router;
