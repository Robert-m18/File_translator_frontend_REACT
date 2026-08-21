import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { confirmEmailRequest } from '../api/auth';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';

/**
 * Strona pod linkiem z maila potwierdzającego.
 *
 * Ścieżka musi brzmieć dokładnie tak, jak adres sklejany przez serwer w treści wiadomości,
 * inaczej link z maila prowadzi na pustą stronę.

 *
 * Po udanym potwierdzeniu strona przechodzi na ekran logowania, zamiast zostawać z komunikatem.
 * Token jest jednorazowy, więc dopóki znajduje się w adresie, każde odświeżenie wysyła go
 * ponownie, a serwer - słusznie - nie znajduje już takiego zgłoszenia. Użytkownik zobaczyłby
 * wtedy komunikat o błędzie zaraz po udanym potwierdzeniu, co czyta się jak awaria. Serwer nie
 * może tego naprawić, bo zużyty token jest dla niego nieodróżnialny od zmyślonego; wie o tym
 * wyłącznie ta strona, i to jedynie do chwili odświeżenia. Zamiast poprawiać komunikat,
 * usunięty zostaje powód jego pokazywania: po sukcesie w historii nie ma już adresu z tokenem.

 *
 * Wpis w historii jest zastępowany, a nie dokładany - inaczej przycisk wstecz wracałby na
 * zużyty link i objaw wracałby razem z nim. Informacja o sukcesie jedzie w adresie, a nie
 * w stanie routera, właśnie po to, żeby przetrwała odświeżenie strony logowania.
 */
export default function ConfirmEmail() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
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
      // Bez setStatus('success'): przez tę jedną klatkę do przekierowania zostaje spinner,
      // a ekran sukcesu jest teraz na logowaniu. Dwa komunikaty o tym samym w dwóch
      // miejscach rozjechałyby się przy pierwszej zmianie treści.
      .then(() => navigate('/?confirmed=1', { replace: true }))
      .catch((err) => {
        setStatus('error');
        setError(err);
      });
  }, [token, navigate]);

  return (
    <div className="card card-lg">
      <header className="card-head">
        <h1>Potwierdzenie adresu</h1>
      </header>

      {status === 'loading' && <Spinner label="Potwierdzanie…" />}

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
