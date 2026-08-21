/**
 * Strażnicy tras.
 *
 * Strażnicy są wygodą dla użytkownika, a nie zabezpieczeniem - front da się obejść zawsze.
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

  // Do czasu poznania odpowiedzi o stanie sesji nie wolno przekierowywać - inaczej każde
  // odświeżenie pulpitu wyrzucałoby na logowanie mimo ważnej sesji.
  if (status === 'loading') return <Spinner label="Sprawdzanie sesji…" />;

  if (status !== 'authenticated') {
    // Zapamiętany cel nawigacji pozwala wrócić tam po zalogowaniu.
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }

  return children;
}

/**
 * Trasa tylko dla administratora.
 *
 * Gałąź stanu ładowania jest konieczna, i to nie z powodów estetycznych: dopóki serwer nie
 * odpowie, dane użytkownika są puste, więc warunek roli nie jest spełniony i każde odświeżenie
 * panelu wyrzucałoby administratora na pulpit. Ten sam błąd co przy strażniku zalogowania,
 * tyle że objawiający się wyłącznie po odświeżeniu strony, czyli trudniejszy do zauważenia.
 *
 * Przekierowanie prowadzi na pulpit, a nie na logowanie: zalogowany użytkownik bez roli jest
 * zalogowany poprawnie, brakuje mu tylko uprawnień. Ekran logowania sugerowałby, że sesja
 * padła, i wysłał go w podróż po własnym haśle.
 */
export function RequireAdmin({ children }) {
  const { status, user } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <Spinner label="Sprawdzanie sesji…" />;
  if (status !== 'authenticated') {
    return <Navigate to="/" replace state={{ from: location.pathname }} />;
  }
  if (user?.role !== 'ADMIN') return <Navigate to="/dashboard" replace />;

  return children;
}

/** Trasa tylko dla niezalogowanych (logowanie, rejestracja). */
export function RequireAnonymous({ children }) {
  const { status } = useAuth();

  if (status === 'loading') return <Spinner label="Sprawdzanie sesji…" />;
  if (status === 'authenticated') return <Navigate to="/dashboard" replace />;

  return children;
}
