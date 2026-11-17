import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { money } from '../format.js';
import { BarChart, ErrorBox, Kpi, Loading, PageHeader } from '../components/ui.jsx';

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [overdue, setOverdue] = useState([]);
  const [error, setError] = useState('');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  useEffect(() => {
    let cancelled = false;
    const query = new URLSearchParams();
    if (from) query.set('from', from);
    if (to) query.set('to', to);
    Promise.all([api.get(`/dashboard/summary?${query}`), api.get('/dashboard/overdue')])
      .then(([s, o]) => { if (!cancelled) { setSummary(s); setOverdue(o); setError(''); } })
      .catch((err) => !cancelled && setError(err.message));
    return () => { cancelled = true; };
  }, [from, to]);

  if (error) return <ErrorBox message={error} />;
  if (!summary) return <Loading />;

  const filtered = Boolean(from || to);
  return (
    <>
      <PageHeader title="Dashboard">
        <label className="inline">Disbursed from <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
        <label className="inline">to <input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      </PageHeader>

      <div className="kpis">
        <Kpi title={filtered ? 'Disbursed (selected dates)' : 'Total disbursed'} value={money(summary.totalDisbursed)} />
        <Kpi title="Outstanding balance" value={money(summary.totalOutstanding)} />
        <Kpi title="Repayment rate" value={summary.repaymentRate === null ? '-' : `${summary.repaymentRate}%`} />
        <Kpi title="Overdue loans" value={summary.overdueLoans} warn={summary.overdueLoans > 0} />
      </div>
      <p className="muted small">
        {summary.totalMembers} members · {summary.activeLoans} active loans · {summary.completedLoans} completed
        {filtered && ` · all-time disbursed ${money(summary.totalDisbursedAllTime)}`}
      </p>

      <div className="two">
        <section className="card">
          <h3>Monthly repayments</h3>
          <BarChart data={summary.monthlyRepayments} />
        </section>
        <section className="card">
          <h3>Overdue loans</h3>
          {overdue.length === 0 ? (
            <p className="muted">No overdue loans. 🎉</p>
          ) : (
            <table>
              <thead><tr><th>Member</th><th>Days</th><th>Overdue</th></tr></thead>
              <tbody>
                {overdue.map((o) => (
                  <tr key={o.loanId}>
                    <td><Link to={`/loans/${o.loanId}`}>{o.memberName}</Link></td>
                    <td className="red">{o.daysOverdue}</td>
                    <td>{money(o.amountOverdue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
