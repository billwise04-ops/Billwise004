import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { money, toInputDate } from '../format.js';
import { ErrorBox, Field, PageHeader } from '../components/ui.jsx';

export default function LoanForm() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [members, setMembers] = useState([]);
  const [form, setForm] = useState({
    memberId: params.get('memberId') || '',
    amount: '',
    purpose: 'fertilizer',
    interestRate: '10',
    interestType: 'flat',
    repaymentPeriodMonths: '12',
    repaymentFrequency: 'monthly',
    disbursementDate: toInputDate(),
  });
  const [preview, setPreview] = useState(null);
  const [previewNote, setPreviewNote] = useState('Enter an amount to see the loan summary.');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get('/members').then(setMembers).catch((err) => setError(err.message));
  }, []);

  // Live summary: ask the API (same maths as the real disbursement) whenever the terms change.
  useEffect(() => {
    if (!(Number(form.amount) > 0)) { setPreview(null); setPreviewNote('Enter an amount to see the loan summary.'); return undefined; }
    let cancelled = false;
    const timer = setTimeout(() => {
      api.post('/loans/preview', {
        amount: form.amount, interestRate: form.interestRate, interestType: form.interestType,
        repaymentPeriodMonths: form.repaymentPeriodMonths, repaymentFrequency: form.repaymentFrequency,
      })
        .then((p) => { if (!cancelled) { setPreview(p); setPreviewNote(''); } })
        .catch((err) => { if (!cancelled) { setPreview(null); setPreviewNote(err.message); } });
    }, 300);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [form.amount, form.interestRate, form.interestType, form.repaymentPeriodMonths, form.repaymentFrequency]);

  const set = (key) => (e) => {
    const next = { ...form, [key]: e.target.value };
    if (key === 'interestType' && e.target.value === 'reducing_balance') next.repaymentFrequency = 'monthly';
    setForm(next);
  };

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const loan = await api.post('/loans', form);
      navigate(`/loans/${loan.id}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Disburse New Loan" />
      <form className="form" onSubmit={submit}>
        <ErrorBox message={error} />
        <div className="two">
          <div>
            <Field label="Member">
              <select value={form.memberId} onChange={set('memberId')} required>
                <option value="">Select a member</option>
                {members.map((m) => <option key={m.id} value={m.id}>{m.registrationNumber} · {m.fullName}</option>)}
              </select>
            </Field>
            <Field label="Amount (KSh)"><input type="number" min="1" step="0.01" value={form.amount} onChange={set('amount')} required /></Field>
            <Field label="Purpose">
              <select value={form.purpose} onChange={set('purpose')}>
                <option value="seed">Seed</option>
                <option value="fertilizer">Fertilizer</option>
                <option value="equipment">Equipment</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <Field label="Interest rate (% per year)"><input type="number" min="0" max="100" step="0.01" value={form.interestRate} onChange={set('interestRate')} required /></Field>
            <Field label="Interest type">
              <select value={form.interestType} onChange={set('interestType')}>
                <option value="flat">Flat rate</option>
                <option value="reducing_balance">Reducing balance</option>
              </select>
            </Field>
            <Field label="Repayment period (months)"><input type="number" min="1" max="120" step="1" value={form.repaymentPeriodMonths} onChange={set('repaymentPeriodMonths')} required /></Field>
            <Field label="Repayment frequency">
              <select value={form.repaymentFrequency} onChange={set('repaymentFrequency')}>
                <option value="monthly">Monthly</option>
                <option value="lump_sum" disabled={form.interestType === 'reducing_balance'}>Lump sum at the end</option>
              </select>
            </Field>
            <Field label="Disbursement date"><input type="date" value={form.disbursementDate} onChange={set('disbursementDate')} required /></Field>
          </div>
          <div>
            <div className="summary">
              <b>Loan summary</b>
              {preview ? (
                <>
                  <p><span>Principal</span><span>{money(preview.principal)}</span></p>
                  <p><span>Interest</span><span>{money(preview.interest)}</span></p>
                  <p className="total"><span>Total repayable</span><span>{money(preview.totalRepayable)}</span></p>
                  <p><span>{preview.instalment ? 'Monthly instalment' : 'Due at the end'}</span>
                     <span>{money(preview.instalment ?? preview.totalRepayable)}</span></p>
                </>
              ) : <p className="muted">{previewNote}</p>}
            </div>
            <div className="actions">
              <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Disburse Loan'}</button>
              <Link className="btn alt" to="/loans">Cancel</Link>
            </div>
          </div>
        </div>
      </form>
    </>
  );
}
