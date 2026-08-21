import { useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { googleErrorMessage } from '../auth/google';
import { validateEmail } from '../utils/validation';
import Alert from '../components/Alert';
import GoogleButton from '../components/GoogleButton';

export default function Login() {
  /*
   * ?confirmed=1 ustawia ConfirmEmail po udanym potwierdzeniu adresu. Nośnikiem jest ADRES,
   * a nie stan routera ani localStorage: stan ginie przy odświeżeniu, a to właśnie
   * odświeżenie było tu pierwotnym problemem - dopóki token siedział w adresie strony
   * potwierdzenia, F5 wysyłało go drugi raz i użytkownik po udanym potwierdzeniu widział
   * błąd o nieprawidłowym linku.
   */
  const [searchParams] = useSearchParams();
  const justConfirmed = searchParams.get('confirmed') === '1';

  /*
   * ?error=KOD ustawia BACKEND, przekierowując tu po nieudanym logowaniu przez Google.
   * Nośnikiem jest adres z tego samego powodu co wyżej, plus jednego dodatkowego:
   * przeglądarka wraca tu z accounts.google.com zwykłą NAWIGACJĄ, więc nie ma żadnego
   * wywołania fetch, którego wynik dałoby się złapać w kodzie - a stan routera nie
   * przetrwałby przejścia przez obcą domenę.
   *
   * Ekran logowania jest tu adresem powrotnym dla porażki, bo /login jako trasa NIE
   * ISTNIEJE - logowanie stoi pod "/". Wskazanie nieistniejącej ścieżki wpadłoby
   * w <Route path="*">, a tamtejsze przekierowanie NIE PRZENOSI query stringa, więc kod
   * błędu przepadłby po drodze i użytkownik dostałby czysty ekran logowania bez słowa
   * wyjaśnienia. Ta zależność jest obustronna: zmiana trasy logowania wymaga zmiany
   * app.oauth2.failure-path po stronie serwera.
   */
  const googleError = googleErrorMessage(searchParams.get('error'));

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function validate() {
    const e = {};
    if (!validateEmail(email)) e.email = 'Niepoprawny adres e-mail';
    // Na logowaniu NIE sprawdzamy polityki hasła. Konto założone przed jej zaostrzeniem
    // dalej ma prawo się zalogować, a odsianie go tutaj byłoby błędem po naszej stronie.
    if (!password) e.password = 'Podaj hasło';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError(null);
    if (!validate()) return;

    setSubmitting(true);
    try {
      await login({ email, password });
      navigate(location.state?.from || '/dashboard', { replace: true });
    } catch (err) {
      setServerError(err);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="card card-lg">
      <header className="card-head">
        <h1>Zaloguj się</h1>
        <p className="muted">Witamy z powrotem</p>
      </header>

      {justConfirmed && (
        <Alert type="success">
          Adres potwierdzony, konto jest gotowe. Możesz się zalogować.
        </Alert>
      )}

      {/*
        Odmowa z Google idzie NAD formularzem, a nie pod nim jak serverError: użytkownik
        wraca tu z obcej domeny i musi zobaczyć powód od razu, zanim zacznie szukać
        winy we własnym haśle.
      */}
      {googleError && <Alert type="error">{googleError}</Alert>}

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {errors.email && <span className="field-error">{errors.email}</span>}
        </label>

        <label className="field">
          <span className="label">Hasło</span>
          <input
            className="input"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password && <span className="field-error">{errors.password}</span>}
        </label>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Logowanie…' : 'Zaloguj'}
        </button>
      </form>

      {serverError && (
        <Alert type="error" traceId={serverError.traceId}>
          {serverError.message}
        </Alert>
      )}

      <div className="divider">albo</div>

      <GoogleButton label="Zaloguj się przez Google" />

      <footer className="card-foot">
        <Link to="/forgot-password">Nie pamiętam hasła</Link>
        <span>
          Nie masz konta? <Link to="/register">Zarejestruj się</Link>
        </span>
        <Link to="/privacy">Polityka prywatności</Link>
      </footer>
    </div>
  );
}
