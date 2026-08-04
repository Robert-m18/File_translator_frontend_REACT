import { useEffect, useRef, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { confirmEmailRequest } from '../api/auth';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

/**
 * Strona pod linkiem z maila potwierdzającego.
 *
 * Ścieżka MUSI brzmieć /confirm-email - taki adres skleja serwer (EmailService:
 * frontendUrl + "/confirm-email?token=..."). Wcześniej ten komponent istniał, ale nie był
 * podpięty do żadnej trasy, więc link z maila prowadził na pustą stronę.
 */
export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  // Brak tokenu widać od razu z adresu, więc stan początkowy liczymy przy renderowaniu.
  // Ustawianie go z efektu wymuszałoby dodatkowy przebieg renderowania po to samo.
  const [status, setStatus] = useState(token ? 'loading' : 'error');
  const [error, setError] = useState(
    token ? null : { message: 'Link jest niekompletny - brakuje w nim tokenu.' }
  );
  const sent = useRef(false);

  useEffect(() => {
    if (!token) return;

    // StrictMode w trybie deweloperskim uruchamia efekty dwukrotnie, a token jest
    // JEDNORAZOWY - bez tej blokady drugie wywołanie zawsze kończyłoby się błędem
    // "token zużyty" i użytkownik widziałby czerwony ekran mimo udanego potwierdzenia.
    if (sent.current) return;
    sent.current = true;

    confirmEmailRequest(token)
      .then(() => setStatus('success'))
      .catch((err) => {
        setStatus('error');
        setError(err);
      });
  }, [token]);

  return (
    <div className="card">
      <header className="card-head">
        <h1>Potwierdzenie adresu</h1>
      </header>

      {status === 'loading' && <Spinner label="Potwierdzanie…" />}

      {status === 'success' && (
        <>
          <Alert type="success">
            Adres potwierdzony, konto jest gotowe. Możesz się zalogować.
          </Alert>
          <Link className="button" to="/">
            Przejdź do logowania
          </Link>
        </>
      )}

      {status === 'error' && (
        <>
          <Alert type="error" traceId={error?.traceId}>
            {error?.message || 'Nie udało się potwierdzić adresu.'}
          </Alert>
          <p className="muted">
            Link mógł wygasnąć (ważny 24 godziny) albo zostać już użyty. Zarejestruj się
            ponownie - dostaniesz świeży link.
          </p>
          <footer className="card-foot">
            <Link to="/register">Zarejestruj się ponownie</Link>
            <Link to="/">Logowanie</Link>
          </footer>
        </>
      )}
    </div>
  );
}
