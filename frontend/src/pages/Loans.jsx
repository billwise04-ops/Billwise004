import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { date, label, loanCode, money } from '../format.js';
import { ErrorBox, Loading, PageHeader, StatusTag } from '../components/ui.jsx';

const FILTERS = ['all', 'active', 'overdue', 'completed'];

export default function Loans() {
  const [loans, setLoans] = useState(null);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/loans').then(setLoans).catch((err) => setError(err.message));
  }, []);

  if (error) return <ErrorBox message={error} />;
  if (!loans) return <Loading />;

  const count = (f) => (f === 'all' ? loans.length : loans.filter((l) => l.status === f).length);
  const q = search.trim().toLowerCase();
  const shown = loans.filter((l) =>
    (filter === 'all' || l.status === filter) &&
    (!q || loanCode(l.id).toLowerCase().includes(q) || l.memberName.toLowerCase().includes(q) || l.registrationNumber.toLowerCase().includes(q))
  );

  return (
    <>
      <PageHeader title="Loans">
        <Link className="btn" to="/loans/new">+ Disburse Loan</Link>
      </PageHeader>
      <div className="chips">
        {FILTERS.map((f) => (
          <button key={f} className={`chip${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
            {label(f)} ({count(f)})
          </button>
        ))}
      </div>
      <input className="search" placeholder="Search by loan ID or member" value={search} onChange={(e) => setSearch(e.target.value)} />
      {shown.length === 0 ? <p className="muted">No loans to show.</p> : (
        <table>
          <thead><tr><th>Loan</th><th>Member</th><th>Amount</th><th>Balance</th><th>Next due</th><th>Status</th></tr></thead>
          <tbody>
            {shown.map((l) => (
              <tr key={l.id}>
                <td><Link to={`/loans/${l.id}`}>{loanCode(l.id)}</Link></td>
                <td>{l.memberName}</td>
                <td>{money(l.amount)}</td>
                <td>{money(l.outstandingBalance)}</td>
                <td>{date(l.nextDue)}</td>
                <td><StatusTag status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
