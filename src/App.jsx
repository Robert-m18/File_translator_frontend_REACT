import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ConfirmEmail from './pages/ConfirmEmail';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import { RequireAuth, RequireAnonymous } from './auth/routes';

/*
 * Adresy /confirm-email, /reset-password i /forgot-password nie są dowolne - serwer skleja
 * dokładnie takie linki w mailach (EmailService). Zmiana którejkolwiek z tych ścieżek
 * unieruchamia maile, które już poszły do skrzynek, więc trzeba je zmieniać razem.
 */
export default function App() {
  return (
    <main className="container">
      <Routes>
        <Route
          path="/"
          element={
            <RequireAnonymous>
              <Login />
            </RequireAnonymous>
          }
        />
        <Route
          path="/register"
          element={
            <RequireAnonymous>
              <Register />
            </RequireAnonymous>
          }
        />
        <Route path="/confirm-email" element={<ConfirmEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <Dashboard />
            </RequireAuth>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </main>
  );
}
