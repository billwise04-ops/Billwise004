const express = require('express');
const prisma = require('../db');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/auth');

const router = express.Router();
router.use(requireAuth);

// GET /api/repayments?limit=100  -> most recent repayments across all loans
router.get('/', asyncHandler(async (req, res) => {
  const limit = Math.min(Math.max(Number.parseInt(req.query.limit, 10) || 100, 1), 500);
  const rows = await prisma.repayment.findMany({
    take: limit,
    orderBy: [{ paymentDate: 'desc' }, { id: 'desc' }],
    include: { officer: { select: { name: true } }, loan: { include: { member: true } } },
  });
  res.json(rows.map((r) => ({
    id: r.id, loanId: r.loanId, memberId: r.loan.memberId, memberName: r.loan.member.fullName,
    amount: Number(r.amount), paymentDate: r.paymentDate, method: r.method,
    balanceAfter: Number(r.balanceAfter), officerName: r.officer.name,
  })));
}));

module.exports = router;
