/**
 * Strażnicy tras.
 *
 * To jest wygoda dla użytkownika, a NIE zabezpieczenie - front da się obejść zawsze.
 * Prawdziwą ochroną jest reguła autoryzacji po stronie serwera; tutaj chodzi tylko o to,
 * żeby nie pokazywać dashboardu komuś, kto i tak zobaczy na nim same błędy 401.
 */
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './context';
import Spinner from '../components/Spinner';

/** Trasa tylko dla zalogowanych. */
export function RequireAuth({ children }) {
  const { status } = useAuth();
  const location = useLocation();

  // Dopóki nie znamy odpowiedzi z /auth/me, nie wolno przekierować - inaczej każde F5
  // na dashboardzie wyrzucałoby na logowanie, mimo ważnej sesji.
  if (status === 'loading') return <Spinner label="Sprawdzanie sesji…" />;

  if (status !== 'authenticated') {
    // Zapamiętujemy, dokąd użytkownik zmierzał, żeby po zalogowaniu tam wrócić.
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/** Trasa tylko dla niezalogowanych (logowanie, rejestracja). */
export function RequireAnonymous({ children }) {
  const { status } = useAuth();

  if (status === 'loading') return <Spinner label="Sprawdzanie sesji…" />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  return children;
}
