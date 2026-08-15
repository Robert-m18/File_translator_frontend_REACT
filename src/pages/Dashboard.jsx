import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
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

      <div className="cta">
        <div>
          <h2>Tłumaczenie plików</h2>
          <p className="muted">
            Wgraj plik .txt, a przetłumaczoną wersję pobierzesz z listy zleceń. O gotowym
            tłumaczeniu powiadomimy Cię też mailem.
          </p>
        </div>
        <Link className="button" to="/translations">
          Przejdź
        </Link>
      </div>

      {/*
        Kafelek panelu widoczny wyłącznie dla administratora. Źródłem prawdy jest to samo
        user.role co odznaka w nagłówku karty - jedno zapytanie /auth/me, jedna odpowiedź,
        żadnej flagi trzymanej obok. Ukrycie kafelka jest wygodą, nie zabezpieczeniem:
        endpointów pilnuje reguła hasRole("ADMIN") po stronie serwera.
      */}
      {user?.role === 'ADMIN' && (
        <div className="cta">
          <div>
            <h2>Panel administracyjny</h2>
            <p className="muted">
              Przegląd kont, blokowanie i odblokowywanie, zdejmowanie blokady po nieudanych
              logowaniach oraz wymuszone wylogowanie.
            </p>
          </div>
          <Link className="button" to="/admin/users">
            Otwórz
          </Link>
        </div>
      )}

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
