import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ErrorBox, Loading, PageHeader, StatusTag } from '../components/ui.jsx';

export default function Members() {
  const [members, setMembers] = useState(null);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(() => {
      api.get(`/members?search=${encodeURIComponent(search)}`)
        .then((rows) => { if (!cancelled) { setMembers(rows); setError(''); } })
        .catch((err) => !cancelled && setError(err.message));
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [search]);

  return (
    <>
      <PageHeader title="Members">
        <Link className="btn" to="/members/new">+ Add Member</Link>
      </PageHeader>
      <input className="search" placeholder="Search by name or registration number" value={search} onChange={(e) => setSearch(e.target.value)} />
      <ErrorBox message={error} />
      {!members ? <Loading /> : members.length === 0 ? (
        <p className="muted">{search ? 'No members match your search.' : 'No members yet. Add your first member to get started.'}</p>
      ) : (
        <table>
          <thead><tr><th>Reg No.</th><th>Name</th><th>Phone</th><th>Active loans</th><th>Status</th></tr></thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td>{m.registrationNumber}</td>
                <td><Link to={`/members/${m.id}`}>{m.fullName}</Link></td>
                <td>{m.phone}</td>
                <td>{m.activeLoans}</td>
                <td><StatusTag status={m.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
