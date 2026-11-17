import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { date, label, loanCode, money } from '../format.js';
import { ErrorBox, Loading, PageHeader } from '../components/ui.jsx';

export default function Repayments() {
  const [rows, setRows] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/repayments?limit=200').then(setRows).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!rows) return <Loading />;

  return (
    <>
      <PageHeader title="Repayments" />
      <p className="muted small">The 200 most recent repayments. To record a new one, open a loan.</p>
      {rows.length === 0 ? <p className="muted">No repayments recorded yet.</p> : (
        <table>
          <thead><tr><th>Date</th><th>Member</th><th>Loan</th><th>Amount</th><th>Method</th><th>Balance after</th><th>Recorded by</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{date(r.paymentDate)}</td>
                <td><Link to={`/members/${r.memberId}`}>{r.memberName}</Link></td>
                <td><Link to={`/loans/${r.loanId}`}>{loanCode(r.loanId)}</Link></td>
                <td>{money(r.amount)}</td>
                <td>{label(r.method)}</td>
                <td>{money(r.balanceAfter)}</td>
                <td>{r.officerName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
