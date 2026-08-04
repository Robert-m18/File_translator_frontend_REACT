import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context';
import Alert from '../components/Alert';

/**
 * Pierwszy ekran za logowaniem. Dane pochodzą z GET /auth/me, czyli z tego samego
 * zapytania, które przy starcie aplikacji stwierdza, że sesja żyje - nie ma tu drugiego
 * źródła prawdy o użytkowniku.
 */
export default function Dashboard() {
  const { user, logout } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function handleLogout() {
    setLoggingOut(true);
    setError(null);
    try {
      // Wywołanie serwera jest tu konieczne, a nie opcjonalne: unieważnia rodzinę tokenów
      // odświeżających. Samo skasowanie ciasteczek zostawiłoby przechwyconą kopię tokenu
      // działającą przez 7 dni.
      await logout();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err);
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <div className="card card-wide">
      <header className="card-head row">
        <div>
          <h1>Cześć, {user?.name}</h1>
          <p className="muted">Jesteś zalogowany</p>
        </div>
        <span className="badge">{user?.role === 'ADMIN' ? 'Administrator' : 'Użytkownik'}</span>
      </header>

      <dl className="details">
        <div>
          <dt>Identyfikator</dt>
          <dd>{user?.id}</dd>
        </div>
        <div>
          <dt>Imię</dt>
          <dd>{user?.name}</dd>
        </div>
        <div>
          <dt>Email</dt>
          <dd>{user?.email}</dd>
        </div>
        <div>
          <dt>Rola</dt>
          <dd>{user?.role}</dd>
        </div>
      </dl>

      <Alert type="info">
        Tłumaczenie plików jeszcze nie istnieje - to miejsce czeka na pierwszy przekrój
        tej funkcji.
      </Alert>

      {error && (
        <Alert type="error" traceId={error.traceId}>
          {error.message}
        </Alert>
      )}

      <button className="button button-ghost" onClick={handleLogout} disabled={loggingOut}>
        {loggingOut ? 'Wylogowywanie…' : 'Wyloguj się'}
      </button>
    </div>
  );
}
