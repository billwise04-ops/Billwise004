import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { toInputDate } from '../format.js';
import { ErrorBox, Field, Loading, PageHeader } from '../components/ui.jsx';

const empty = { fullName: '', registrationNumber: '', phone: '', joinDate: toInputDate(), farmDetails: '' };

export default function MemberForm() {
  const { id } = useParams(); // present when editing
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(Boolean(id));
  const [error, setError] = useState('');
  const [regError, setRegError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/members/${id}`)
      .then((m) => setForm({
        fullName: m.fullName, registrationNumber: m.registrationNumber, phone: m.phone,
        joinDate: toInputDate(m.joinDate), farmDetails: m.farmDetails || '',
      }))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setError('');
    setRegError('');
    setBusy(true);
    try {
      const saved = id ? await api.put(`/members/${id}`, form) : await api.post('/members', form);
      navigate(`/members/${saved.id}`);
    } catch (err) {
      if (err.status === 409) setRegError(err.message); // duplicate registration number
      else setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading />;
  return (
    <>
      <PageHeader title={id ? 'Edit Member' : 'Add Member'} />
      <form className="form" onSubmit={submit}>
        <ErrorBox message={error} />
        <div className="two">
          <div>
            <Field label="Full name"><input value={form.fullName} onChange={set('fullName')} required /></Field>
            <Field label="Registration number" error={regError}>
              <input value={form.registrationNumber} onChange={set('registrationNumber')} required />
            </Field>
            <Field label="Phone"><input value={form.phone} onChange={set('phone')} required /></Field>
          </div>
          <div>
            <Field label="Join date"><input type="date" value={form.joinDate} onChange={set('joinDate')} required /></Field>
            <Field label="Farm details (optional)"><textarea rows="4" value={form.farmDetails} onChange={set('farmDetails')} /></Field>
          </div>
        </div>
        <div className="actions">
          <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save Member'}</button>
          <Link className="btn alt" to={id ? `/members/${id}` : '/members'}>Cancel</Link>
        </div>
      </form>
    </>
  );
}
