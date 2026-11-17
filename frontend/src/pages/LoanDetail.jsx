import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { date, label, loanCode, money, toInputDate } from '../format.js';
import { ErrorBox, Field, Kpi, Loading, PageHeader, StatusTag } from '../components/ui.jsx';

export default function LoanDetail() {
  const { id } = useParams();
  const [loan, setLoan] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState({ amount: '', method: 'mobile_money', paymentDate: toInputDate() });
  const [formError, setFormError] = useState('');
  const [saved, setSaved] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api.get(`/loans/${id}`).then(setLoan).catch((err) => setError(err.message));
  }, [id]);
  useEffect(load, [load]);

  async function submit(e) {
    e.preventDefault();
    setFormError('');
    setSaved('');
    setBusy(true);
    try {
      const res = await api.post(`/loans/${id}/repayments`, form);
      setSaved(`Repayment of ${money(res.repayment.amount)} saved. New balance: ${money(res.repayment.balanceAfter)}.`);
      setForm({ ...form, amount: '' });
      load();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <ErrorBox message={error} />;
  if (!loan) return <Loading />;

  return (
    <>
      <PageHeader title={`Loan ${loanCode(loan.id)} · ${loan.member.fullName}`}>
        <StatusTag status={loan.status} />
        <Link className="btn alt" to={`/members/${loan.member.id}`}>View member</Link>
      </PageHeader>
      <p className="muted small">
        {label(loan.purpose)} · {loan.interestRate}% {loan.interestType === 'flat' ? 'flat' : 'reducing balance'} · {loan.repaymentPeriodMonths} months, {label(loan.repaymentFrequency).toLowerCase()} · disbursed {date(loan.disbursementDate)}
        {loan.status === 'overdue' && ` · ${loan.daysOverdue} days overdue (${money(loan.amountOverdue)})`}
      </p>

      <div className="kpis">
        <Kpi title="Principal" value={money(loan.amount)} />
        <Kpi title="Total repayable" value={money(loan.totalRepayable)} />
        <Kpi title="Paid" value={money(loan.paid)} />
        <Kpi title="Balance" value={money(loan.outstandingBalance)} warn={loan.status === 'overdue'} />
      </div>

      <div className="two">
        <section>
          <h3>Repayment history</h3>
          {loan.repayments.length === 0 ? <p className="muted">No repayments yet.</p> : (
            <table>
              <thead><tr><th>Date</th><th>Amount</th><th>Method</th><th>Balance after</th></tr></thead>
              <tbody>
                {loan.repayments.map((r) => (
                  <tr key={r.id}><td>{date(r.paymentDate)}</td><td>{money(r.amount)}</td><td>{label(r.method)}</td><td>{money(r.balanceAfter)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="card">
          <h3>Log repayment</h3>
          {loan.status === 'completed' ? <p className="muted">This loan is fully repaid. ✅</p> : (
            <form onSubmit={submit}>
              <ErrorBox message={formError} />
              {saved && <div className="ok-box">{saved}</div>}
              <Field label="Amount (KSh)">
                <input type="number" min="0.01" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
              </Field>
              <button type="button" className="link-btn" onClick={() => setForm({ ...form, amount: String(loan.outstandingBalance) })}>Use full balance</button>
              <Field label="Method">
                <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
                  <option value="mobile_money">Mobile money</option>
                  <option value="cash">Cash</option>
                  <option value="bank">Bank</option>
                </select>
              </Field>
              <Field label="Payment date">
                <input type="date" max={toInputDate()} value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
              </Field>
              <button className="btn" disabled={busy}>{busy ? 'Saving...' : 'Save Repayment'}</button>
            </form>
          )}
        </section>
      </div>

      <h3>Repayment schedule</h3>
      <table>
        <thead><tr><th>#</th><th>Due date</th><th>Instalment</th><th>Cumulative due</th><th>State</th></tr></thead>
        <tbody>
          {loan.schedule.map((m) => (
            <tr key={m.number}>
              <td>{m.number}</td><td>{date(m.dueDate)}</td><td>{money(m.amountDue)}</td><td>{money(m.cumulativeDue)}</td>
              <td><StatusTag status={m.state} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
