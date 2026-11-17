// The database module is replaced with an empty stub: these tests only exercise logic.
jest.mock('../src/db', () => ({}));

const { evaluateLoan, presentLoan, syncLoanStatuses } = require('../src/services/loanService');

const d = (s) => new Date(`${s}T00:00:00Z`);

// Prisma returns Decimal values; numeric strings behave the same way for our code.
const loan = (overrides = {}) => ({
  id: 1,
  memberId: 7,
  amount: '12000',
  purpose: 'seed',
  interestRate: '0',
  interestType: 'flat',
  disbursementDate: d('2026-01-01'),
  repaymentPeriodMonths: 12,
  repaymentFrequency: 'monthly',
  totalRepayable: '12000',
  outstandingBalance: '12000',
  status: 'active',
  ...overrides,
});

describe('evaluateLoan', () => {
  test('flags a missed milestone with days and amount overdue', () => {
    const ev = evaluateLoan(loan(), d('2026-02-11'));
    expect(ev.status).toBe('overdue');
    expect(ev.daysOverdue).toBe(10);
    expect(ev.amountOverdue).toBe(1000);
    expect(ev.nextDue.toISOString().slice(0, 10)).toBe('2026-02-01');
  });
  test('a loan that is paid up has nothing overdue', () => {
    const ev = evaluateLoan(loan({ outstandingBalance: '11000' }), d('2026-02-11'));
    expect(ev.status).toBe('active');
    expect(ev.daysOverdue).toBe(0);
    expect(ev.amountOverdue).toBe(0);
    expect(ev.paid).toBe(1000);
  });
  test('a fully repaid loan is completed and has no next due date', () => {
    const ev = evaluateLoan(loan({ outstandingBalance: '0' }), d('2026-02-11'));
    expect(ev.status).toBe('completed');
    expect(ev.nextDue).toBe(null);
  });
});

describe('presentLoan', () => {
  test('converts Decimals to numbers and includes the member name', () => {
    const view = presentLoan({ ...loan(), member: { fullName: 'Jane Mwangi', registrationNumber: 'M-001' } }, d('2026-01-10'));
    expect(view.amount).toBe(12000);
    expect(view.outstandingBalance).toBe(12000);
    expect(view.memberName).toBe('Jane Mwangi');
    expect(view.status).toBe('active');
  });
});

describe('syncLoanStatuses', () => {
  test('only updates loans whose status changed', async () => {
    const updates = [];
    const db = {
      loan: {
        findMany: async () => [loan({ id: 1 }), loan({ id: 2, outstandingBalance: '11000' })],
        update: (args) => { updates.push(args); return args; },
      },
      $transaction: async (ops) => ops,
    };
    const changed = await syncLoanStatuses(db, d('2026-02-11'));
    expect(changed).toBe(1);
    expect(updates).toEqual([{ where: { id: 1 }, data: { status: 'overdue' } }]);
  });
});
