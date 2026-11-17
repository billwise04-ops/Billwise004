const {
  calculateTotalRepayable, generateSchedule, applyRepayment,
  computeLoanStatus, daysOverdue, addMonths, sumMoney,
  expectedDueByDate, annotateSchedule,
} = require('../src/services/balanceCalculator');

const d = (s) => new Date(`${s}T00:00:00Z`);

describe('calculateTotalRepayable', () => {
  test('flat: 10,000 at 10% over 12 months = 11,000', () => {
    expect(calculateTotalRepayable(10000, 10, 12, 'flat')).toBe(11000);
  });
  test('flat: part-year period (5,000 at 7.5% over 9 months = 5,281.25)', () => {
    expect(calculateTotalRepayable(5000, 7.5, 9, 'flat')).toBe(5281.25);
  });
  test('flat: 0% interest returns the principal', () => {
    expect(calculateTotalRepayable(8000, 0, 6, 'flat')).toBe(8000);
  });
  test('reducing balance: 10,000 at 12% over 12 months', () => {
    expect(calculateTotalRepayable(10000, 12, 12, 'reducing_balance')).toBe(10661.88);
  });
  test('rejects bad input', () => {
    expect(() => calculateTotalRepayable(0, 10, 12)).toThrow();
    expect(() => calculateTotalRepayable(1000, -1, 12)).toThrow();
    expect(() => calculateTotalRepayable(1000, 10, 0)).toThrow();
    expect(() => calculateTotalRepayable(1000, 10, 6.5)).toThrow();
    expect(() => calculateTotalRepayable(1000, 10, 12, 'weird')).toThrow();
  });
});

describe('addMonths', () => {
  test('clamps to month end', () => {
    expect(addMonths(d('2026-01-31'), 1).toISOString().slice(0, 10)).toBe('2026-02-28');
  });
  test('rolls over the year', () => {
    expect(addMonths(d('2026-11-15'), 3).toISOString().slice(0, 10)).toBe('2027-02-15');
  });
});

describe('generateSchedule', () => {
  test('monthly schedule has one milestone per month and sums to the total', () => {
    const s = generateSchedule(d('2026-01-15'), 12, 'monthly', 11000);
    expect(s).toHaveLength(12);
    expect(s[0].amountDue).toBe(916.66);
    expect(s[11].amountDue).toBe(916.74); // last instalment absorbs the rounding remainder
    expect(s[11].cumulativeDue).toBe(11000);
  });
  test('lump sum has a single milestone at the end of the period', () => {
    const s = generateSchedule(d('2026-01-15'), 12, 'lump_sum', 11000);
    expect(s).toHaveLength(1);
    expect(s[0].dueDate.toISOString().slice(0, 10)).toBe('2027-01-15');
    expect(s[0].cumulativeDue).toBe(11000);
  });
  test('rejects unknown frequency', () => {
    expect(() => generateSchedule(d('2026-01-15'), 12, 'weekly', 1000)).toThrow();
  });
});

describe('applyRepayment', () => {
  test('partial payment reduces the balance and keeps the loan active', () => {
    expect(applyRepayment(11000, 2000)).toEqual({ newBalance: 9000, status: 'active' });
  });
  test('exact final payment completes the loan', () => {
    expect(applyRepayment(11000, 11000)).toEqual({ newBalance: 0, status: 'completed' });
  });
  test('overpayment is rejected', () => {
    expect(() => applyRepayment(500, 500.01)).toThrow(/exceeds/);
  });
  test('zero and negative amounts are rejected', () => {
    expect(() => applyRepayment(500, 0)).toThrow();
    expect(() => applyRepayment(500, -10)).toThrow();
  });
  test('no floating-point drift (0.3 - 0.1 is exactly 0.2)', () => {
    expect(applyRepayment(0.3, 0.1).newBalance).toBe(0.2);
  });
});

describe('computeLoanStatus', () => {
  // 12,000 over 12 months, 1,000 due on the 1st of each month from 1 Feb 2026
  const schedule = generateSchedule(d('2026-01-01'), 12, 'monthly', 12000);

  test('a loan disbursed today is active', () => {
    expect(computeLoanStatus(12000, 12000, schedule, d('2026-01-01'))).toBe('active');
  });
  test('a milestone due today is not yet overdue', () => {
    expect(computeLoanStatus(12000, 12000, schedule, d('2026-02-01'))).toBe('active');
  });
  test('a missed milestone makes the loan overdue the next day', () => {
    expect(computeLoanStatus(12000, 12000, schedule, d('2026-02-02'))).toBe('overdue');
  });
  test('a partial payment below the amount due is still overdue', () => {
    expect(computeLoanStatus(12000, 11500, schedule, d('2026-02-02'))).toBe('overdue');
  });
  test('paying on time keeps the loan active', () => {
    expect(computeLoanStatus(12000, 11000, schedule, d('2026-02-02'))).toBe('active');
  });
  test('paying ahead of schedule keeps the loan active', () => {
    expect(computeLoanStatus(12000, 9000, schedule, d('2026-03-15'))).toBe('active');
  });
  test('catching up clears overdue status', () => {
    expect(computeLoanStatus(12000, 12000, schedule, d('2026-03-15'))).toBe('overdue');
    expect(computeLoanStatus(12000, 10000, schedule, d('2026-03-15'))).toBe('active');
  });
  test('a fully paid loan is completed regardless of dates', () => {
    expect(computeLoanStatus(12000, 0, schedule, d('2027-06-01'))).toBe('completed');
  });
});

describe('daysOverdue', () => {
  const schedule = generateSchedule(d('2026-01-01'), 12, 'monthly', 12000);
  test('counts days since the earliest unpaid milestone', () => {
    expect(daysOverdue(12000, 12000, schedule, d('2026-02-11'))).toBe(10);
  });
  test('is 0 once the member has paid what is due', () => {
    expect(daysOverdue(12000, 11000, schedule, d('2026-02-11'))).toBe(0);
  });
  test('is 0 before any milestone has passed', () => {
    expect(daysOverdue(12000, 12000, schedule, d('2026-01-20'))).toBe(0);
  });
});

describe('sumMoney', () => {
  test('adds without float drift', () => {
    expect(sumMoney([0.1, 0.2])).toBe(0.3);
  });
});

describe('expectedDueByDate', () => {
  const schedule = generateSchedule(d('2026-01-01'), 12, 'monthly', 12000);
  test('is 0 before the first milestone has passed', () => {
    expect(expectedDueByDate(schedule, d('2026-01-20'))).toBe(0);
  });
  test('is the cumulative amount for passed milestones', () => {
    expect(expectedDueByDate(schedule, d('2026-03-15'))).toBe(2000);
  });
});

describe('annotateSchedule', () => {
  const schedule = generateSchedule(d('2026-01-01'), 12, 'monthly', 12000);
  test('marks paid, overdue and upcoming milestones', () => {
    const rows = annotateSchedule(schedule, 1000, d('2026-03-15'));
    expect(rows[0].state).toBe('paid');
    expect(rows[1].state).toBe('overdue');
    expect(rows[2].state).toBe('upcoming');
    expect(rows[0].number).toBe(1);
  });
});
