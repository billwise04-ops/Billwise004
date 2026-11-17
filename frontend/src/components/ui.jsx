import { label } from '../format.js';

export function StatusTag({ status }) {
  return <span className={`tag tag-${String(status).replace(/\s/g, '-')}`}>{label(status)}</span>;
}

export function Kpi({ title, value, warn }) {
  return (
    <div className={`kpi${warn ? ' warn' : ''}`}>
      <small>{title}</small>
      <b>{value}</b>
    </div>
  );
}

export function PageHeader({ title, children }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      <div className="actions">{children}</div>
    </div>
  );
}

export const ErrorBox = ({ message }) => (message ? <div className="error-box" role="alert">{message}</div> : null);
export const Loading = () => <p className="muted">Loading...</p>;

export function Field({ label: text, error, children }) {
  return (
    <label className={`field${error ? ' bad' : ''}`}>
      <span>{text}</span>
      {children}
      {error && <em className="field-error">{error}</em>}
    </label>
  );
}

// Simple bar chart drawn with SVG (no chart library needed).
export function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.total), 1);
  const width = 360;
  const height = 150;
  const barW = width / data.length;
  return (
    <svg viewBox={`0 0 ${width} ${height + 24}`} className="bar-chart" role="img" aria-label="Repayments received per month">
      {data.map((d, i) => {
        const h = Math.max((d.total / max) * height, d.total > 0 ? 3 : 0);
        return (
          <g key={d.key}>
            <rect x={i * barW + 10} y={height - h} width={barW - 20} height={h} rx="4" className={i % 2 ? 'bar-a' : 'bar-b'}>
              <title>{`${d.label}: KSh ${d.total.toLocaleString('en-KE')}`}</title>
            </rect>
            <text x={i * barW + barW / 2} y={height + 16} textAnchor="middle" className="bar-label">{d.label}</text>
          </g>
        );
      })}
    </svg>
  );
}
