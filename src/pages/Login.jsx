import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/context';
import { validateEmail } from '../utils/validation';
import Alert from '../components/Alert';

export default function Login() {
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
    <div className="card">
      <header className="card-head">
        <h1>Zaloguj się</h1>
        <p className="muted">Witamy z powrotem</p>
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

      <footer className="card-foot">
        <Link to="/forgot-password">Nie pamiętam hasła</Link>
        <span>
          Nie masz konta? <Link to="/register">Zarejestruj się</Link>
        </span>
      </footer>
    </div>
  );
}
