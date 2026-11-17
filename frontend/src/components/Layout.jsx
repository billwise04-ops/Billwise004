import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth.jsx';

const links = [
  ['/', 'Dashboard', true],
  ['/members', 'Members'],
  ['/loans', 'Loans'],
  ['/repayments', 'Repayments'],
  ['/reports', 'Reports'],
];

export default function Layout() {
  const { officer, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">🌱 AgriLedger</div>
        <nav>
          {links.map(([to, text, end]) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => (isActive ? 'nav on' : 'nav')}>
              {text}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-foot">
          <div className="who">{officer?.name}</div>
          <button className="link-btn" onClick={() => { logout(); navigate('/login'); }}>Log out</button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
