import { useState } from 'react';
import { api } from '../api.js';
import { downloadCsv, label, loanCode } from '../format.js';
import { ErrorBox, PageHeader } from '../components/ui.jsx';

export default function Reports() {
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');

  async function exportLoans() {
    setError(''); setBusy('loans');
    try {
      const loans = await api.get('/loans');
      downloadCsv('agriledger-loans.csv', [
        { header: 'Loan', value: (l) => loanCode(l.id) },
        { header: 'Member', value: (l) => l.memberName },
        { header: 'Registration number', value: (l) => l.registrationNumber },
        { header: 'Purpose', value: (l) => label(l.purpose) },
        { header: 'Amount', value: (l) => l.amount },
        { header: 'Interest rate %', value: (l) => l.interestRate },
        { header: 'Total repayable', value: (l) => l.totalRepayable },
        { header: 'Paid', value: (l) => l.paid },
        { header: 'Outstanding balance', value: (l) => l.outstandingBalance },
        { header: 'Status', value: (l) => l.status },
        { header: 'Days overdue', value: (l) => l.daysOverdue },
        { header: 'Disbursed', value: (l) => String(l.disbursementDate).slice(0, 10) },
      ], loans);
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  async function exportRepayments() {
    setError(''); setBusy('repayments');
    try {
      const rows = await api.get('/repayments?limit=500');
      downloadCsv('agriledger-repayments.csv', [
        { header: 'Date', value: (r) => String(r.paymentDate).slice(0, 10) },
        { header: 'Member', value: (r) => r.memberName },
        { header: 'Loan', value: (r) => loanCode(r.loanId) },
        { header: 'Amount', value: (r) => r.amount },
        { header: 'Method', value: (r) => label(r.method) },
        { header: 'Balance after', value: (r) => r.balanceAfter },
        { header: 'Recorded by', value: (r) => r.officerName },
      ], rows);
    } catch (err) { setError(err.message); } finally { setBusy(''); }
  }

  return (
    <>
      <PageHeader title="Reports" />
      <ErrorBox message={error} />
      <p className="muted">Download your records as CSV files that open in Excel or Google Sheets.</p>
      <div className="actions">
        <button className="btn" onClick={exportLoans} disabled={busy === 'loans'}>{busy === 'loans' ? 'Preparing...' : 'Download loans (CSV)'}</button>
        <button className="btn alt" onClick={exportRepayments} disabled={busy === 'repayments'}>{busy === 'repayments' ? 'Preparing...' : 'Download repayments (CSV)'}</button>
      </div>
    </>
  );
}
