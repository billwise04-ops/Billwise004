import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { date, label, money } from '../format.js';
import { ErrorBox, Kpi, Loading, PageHeader, StatusTag } from '../components/ui.jsx';

export default function MemberProfile() {
  const { id } = useParams();
  const [member, setMember] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get(`/members/${id}`).then(setMember).catch((err) => setError(err.message));
  }, [id]);

  if (error) return <ErrorBox message={error} />;
  if (!member) return <Loading />;

  return (
    <>
      <PageHeader title={`${member.fullName} · ${member.registrationNumber}`}>
        <Link className="btn alt" to={`/members/${member.id}/edit`}>Edit</Link>
        <Link className="btn" to={`/loans/new?memberId=${member.id}`}>+ Disburse loan</Link>
      </PageHeader>
      <p className="muted small">
        {member.phone} · Joined {date(member.joinDate)}{member.farmDetails ? ` · ${member.farmDetails}` : ''}
      </p>

      <div className="kpis three">
        <Kpi title="Total borrowed" value={money(member.totals.totalBorrowed)} />
        <Kpi title="Total repaid" value={money(member.totals.totalRepaid)} />
        <Kpi title="Active balance" value={money(member.totals.activeBalance)} warn={member.totals.activeBalance > 0} />
      </div>

      <h3>Loan history</h3>
      {member.loans.length === 0 ? <p className="muted">This member has no loans yet.</p> : (
        <table>
          <thead><tr><th>Loan</th><th>Purpose</th><th>Amount</th><th>Disbursed</th><th>Balance</th><th>Status</th></tr></thead>
          <tbody>
            {member.loans.map((l) => (
              <tr key={l.id}>
                <td><Link to={`/loans/${l.id}`}>L-{String(l.id).padStart(3, '0')}</Link></td>
                <td>{label(l.purpose)}</td>
                <td>{money(l.amount)}</td>
                <td>{date(l.disbursementDate)}</td>
                <td>{money(l.outstandingBalance)}</td>
                <td><StatusTag status={l.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
