import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';
import { getToken } from '../api.js';
import { ErrorBox, Field } from '../components/ui.jsx';

export default function Login() {
  const { officer, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (officer && getToken()) return <Navigate to="/" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="login">
      <div className="login-left">
        <h1>AgriLedger</h1>
        <p>Loan &amp; repayment tracking for agricultural SACCOs.</p>
      </div>
      <form className="login-right" onSubmit={submit}>
        <h2>Officer Sign In</h2>
        <ErrorBox message={error} />
        <Field label="Email">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
        </Field>
        <Field label="Password">
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
        </Field>
        <button className="btn" disabled={busy}>{busy ? 'Signing in...' : 'Sign In'}</button>
      </form>
    </div>
  );
}
