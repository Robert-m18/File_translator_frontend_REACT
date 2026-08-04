import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { resetPasswordRequest } from '../api/auth';
import { passwordError, PASSWORD_HINT } from '../utils/validation';
import Alert from '../components/Alert';

/**
 * Strona pod linkiem z maila resetu hasła (EmailService: frontendUrl +
 * "/reset-password?token=...").
 *
 * Udany reset unieważnia po stronie serwera WSZYSTKIE sesje i czyści ciasteczka, więc
 * po nim nie ma dokąd wracać poza ekranem logowania - i tak to jest tu obsłużone.
 */
export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError(null);

    const e = {};
    const pwdError = passwordError(password);
    if (pwdError) e.password = pwdError;
    if (password !== password2) e.password2 = 'Hasła nie są takie same';
    setErrors(e);
    if (Object.keys(e).length > 0) return;

    setSubmitting(true);
    try {
      await resetPasswordRequest({ token, password });
      setDone(true);
    } catch (err) {
      setServerError(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="card">
        <header className="card-head">
          <h1>Ustaw nowe hasło</h1>
        </header>
        <Alert type="error">Link jest niekompletny - brakuje w nim tokenu.</Alert>
        <footer className="card-foot">
          <Link to="/forgot-password">Poproś o nowy link</Link>
        </footer>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card">
        <header className="card-head">
          <h1>Hasło zmienione</h1>
        </header>
        <Alert type="success">
          Ze względów bezpieczeństwa wylogowaliśmy Cię na wszystkich urządzeniach.
          Zaloguj się nowym hasłem.
        </Alert>
        <Link className="button" to="/">
          Przejdź do logowania
        </Link>
      </div>
    );
  }

  return (
    <div className="card">
      <header className="card-head">
        <h1>Ustaw nowe hasło</h1>
      </header>

      <form className="form" onSubmit={handleSubmit} noValidate>
        <label className="field">
          <span className="label">Nowe hasło</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {errors.password ? (
            <span className="field-error">{errors.password}</span>
          ) : (
            <span className="field-hint">{PASSWORD_HINT}</span>
          )}
        </label>

        <label className="field">
          <span className="label">Powtórz hasło</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            value={password2}
            onChange={(e) => setPassword2(e.target.value)}
          />
          {errors.password2 && <span className="field-error">{errors.password2}</span>}
        </label>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Zapisywanie…' : 'Ustaw hasło'}
        </button>
      </form>

      {serverError && (
        <Alert type="error" traceId={serverError.traceId}>
          {serverError.message}
        </Alert>
      )}

      <footer className="card-foot">
        <Link to="/forgot-password">Poproś o nowy link</Link>
      </footer>
    </div>
  );
}
