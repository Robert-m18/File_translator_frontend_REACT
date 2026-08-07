import { useState } from 'react';
import { Link } from 'react-router-dom';
import { forgotPasswordRequest } from '../api/auth';
import { validateEmail } from '../utils/validation';
import Alert from '../components/Alert';

/**
 * Serwer linkuje tu wprost z maila "ktoś próbował założyć konto na Twój adres"
 * (EmailService: frontendUrl + "/forgot-password"), więc ta trasa musi istnieć
 * pod dokładnie tym adresem.
 */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState(null);
  const [serverError, setServerError] = useState(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(ev) {
    ev.preventDefault();
    setServerError(null);

    if (!validateEmail(email)) {
      setError('Niepoprawny adres e-mail');
      return;
    }
    setError(null);

    setSubmitting(true);
    try {
      await forgotPasswordRequest(email);
      setSent(true);
    } catch (err) {
      setServerError(err);
    } finally {
      setSubmitting(false);
    }
  }

  // Komunikat identyczny dla adresu znanego i nieznanego - serwer celowo nie zdradza,
  // które adresy mają konto, i front nie może tego obejść własnym tekstem.
  if (sent) {
    return (
      <div className="card card-lg">
        <header className="card-head">
          <h1>Sprawdź skrzynkę</h1>
        </header>
        <Alert type="success">
          Jeśli konto o tym adresie istnieje, wysłaliśmy na nie link do ustawienia nowego
          hasła. Link jest ważny godzinę i można go użyć raz.
        </Alert>
        <footer className="card-foot">
          <Link to="/">Wróć do logowania</Link>
        </footer>
      </div>
    );
  }

  return (
    <div className="card card-lg">
      <header className="card-head">
        <h1>Nie pamiętam hasła</h1>
        <p className="muted">Wyślemy link do ustawienia nowego</p>
      </header>

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
          {error && <span className="field-error">{error}</span>}
        </label>

        <button className="button" type="submit" disabled={submitting}>
          {submitting ? 'Wysyłanie…' : 'Wyślij link'}
        </button>
      </form>

      {serverError && (
        <Alert type="error" traceId={serverError.traceId}>
          {serverError.message}
        </Alert>
      )}

      <footer className="card-foot">
        <Link to="/">Wróć do logowania</Link>
      </footer>
    </div>
  );
}
