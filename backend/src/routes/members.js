const express = require('express');
const prisma = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/auth');
const { sumMoney } = require('../services/balanceCalculator');
const { presentLoan, syncLoanStatuses } = require('../services/loanService');

const router = express.Router();
router.use(requireAuth); // every members route needs a logged-in officer

// ---------- helpers ----------
function parseId(req, res) {
  const id = Number.parseInt(req.params.id, 10);
  if (!Number.isInteger(id) || id < 1) {
    res.status(400).json({ error: 'Invalid member id.' });
    return null;
  }
  return id;
}

// Build a clean data object from the request body, or return { error }.
function readMemberBody(body = {}, { partial = false } = {}) {
  const data = {};
  const text = (key) => (body[key] === undefined || body[key] === null ? undefined : String(body[key]).trim());

  const fullName = text('fullName');
  const registrationNumber = text('registrationNumber');
  const phone = text('phone');

  if (!partial) {
    if (!fullName) return { error: 'Full name is required.' };
    if (!registrationNumber) return { error: 'Registration number is required.' };
    if (!phone) return { error: 'Phone number is required.' };
  }
  if (fullName !== undefined) { if (!fullName) return { error: 'Full name cannot be empty.' }; data.fullName = fullName; }
  if (registrationNumber !== undefined) { if (!registrationNumber) return { error: 'Registration number cannot be empty.' }; data.registrationNumber = registrationNumber; }
  if (phone !== undefined) { if (!phone) return { error: 'Phone number cannot be empty.' }; data.phone = phone; }
  if (body.farmDetails !== undefined) data.farmDetails = text('farmDetails') || null;

  if (body.joinDate !== undefined) {
    const joinDate = new Date(body.joinDate);
    if (Number.isNaN(joinDate.getTime())) return { error: 'Join date is not a valid date.' };
    data.joinDate = joinDate;
  } else if (!partial) {
    data.joinDate = new Date();
  }
  return { data };
}

// Friendly duplicate message, e.g. "M-002 is already registered to Peter Otieno."
async function duplicateMessage(registrationNumber) {
  const existing = await prisma.member.findUnique({ where: { registrationNumber } });
  return existing
    ? `${registrationNumber} is already registered to ${existing.fullName}.`
    : `${registrationNumber} is already registered.`;
}

// Summary shown in the members list: loan count + overall status.
function withListStatus(member) {
  const { loans, ...rest } = member;
  const statuses = loans.map((l) => l.status);
  const status = statuses.includes('overdue') ? 'overdue'
    : statuses.includes('active') ? 'active'
    : statuses.length ? 'completed' : 'no loans';
  return { ...rest, activeLoans: statuses.filter((s) => s !== 'completed').length, status };
}

// ---------- routes ----------

// POST /api/members
router.post('/', asyncHandler(async (req, res) => {
  const { data, error } = readMemberBody(req.body);
  if (error) return res.status(400).json({ error });

  try {
    const member = await prisma.member.create({ data });
    res.status(201).json(member);
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: await duplicateMessage(data.registrationNumber) });
    throw err;
  }
}));

// GET /api/members?search=jane
router.get('/', asyncHandler(async (req, res) => {
  await syncLoanStatuses();
  const search = String(req.query.search || '').trim();
  const where = search
    ? { OR: [
        { fullName: { contains: search, mode: 'insensitive' } },
        { registrationNumber: { contains: search, mode: 'insensitive' } },
      ] }
    : {};

  const members = await prisma.member.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    include: { loans: { select: { status: true } } },
  });
  res.json(members.map(withListStatus));
}));

// GET /api/members/:id  (profile + loan history + totals)
router.get('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  await syncLoanStatuses();
  const member = await prisma.member.findUnique({
    where: { id },
    include: { loans: { orderBy: { disbursementDate: 'desc' } } },
  });
  if (!member) return res.status(404).json({ error: 'Member not found.' });

  const { loans: rawLoans, ...rest } = member;
  const loans = rawLoans.map((l) => presentLoan({ ...l, member }));
  const totals = {
    totalBorrowed: sumMoney(loans.map((l) => l.amount)),
    totalRepaid: sumMoney(loans.map((l) => l.paid)),
    activeBalance: sumMoney(loans.filter((l) => l.status !== 'completed').map((l) => l.outstandingBalance)),
  };
  res.json({ ...rest, loans, totals });
}));

// PUT /api/members/:id  (send only the fields you want to change)
router.put('/:id', asyncHandler(async (req, res) => {
  const id = parseId(req, res);
  if (id === null) return;

  const { data, error } = readMemberBody(req.body, { partial: true });
  if (error) return res.status(400).json({ error });
  if (Object.keys(data).length === 0) return res.status(400).json({ error: 'Nothing to update.' });

  try {
    const member = await prisma.member.update({ where: { id }, data });
    res.json(member);
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Member not found.' });
    if (err.code === 'P2002') return res.status(409).json({ error: await duplicateMessage(data.registrationNumber) });
    throw err;
  }
}));

module.exports = router;
