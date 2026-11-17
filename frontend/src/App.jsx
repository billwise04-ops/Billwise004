import { Routes, Route, Link } from 'react-router-dom';
import { RequireAuth } from './auth.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Members from './pages/Members.jsx';
import MemberForm from './pages/MemberForm.jsx';
import MemberProfile from './pages/MemberProfile.jsx';
import Loans from './pages/Loans.jsx';
import LoanForm from './pages/LoanForm.jsx';
import LoanDetail from './pages/LoanDetail.jsx';
import Repayments from './pages/Repayments.jsx';
import Reports from './pages/Reports.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Dashboard />} />
        <Route path="members" element={<Members />} />
        <Route path="members/new" element={<MemberForm />} />
        <Route path="members/:id" element={<MemberProfile />} />
        <Route path="members/:id/edit" element={<MemberForm />} />
        <Route path="loans" element={<Loans />} />
        <Route path="loans/new" element={<LoanForm />} />
        <Route path="loans/:id" element={<LoanDetail />} />
        <Route path="repayments" element={<Repayments />} />
        <Route path="reports" element={<Reports />} />
        <Route path="*" element={<p>Page not found. <Link to="/">Back to dashboard</Link></p>} />
      </Route>
    </Routes>
  );
}
