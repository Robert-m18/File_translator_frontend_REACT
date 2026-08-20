import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { registerRequest } from '../api/auth';
import { validateEmail, passwordError, nameError, PASSWORD_HINT } from '../utils/validation';
import Alert from '../components/Alert';
import GoogleButton from '../components/GoogleButton';

export default function Register() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm();

  async function onSubmit(data) {
    setServerError(null);
    try {
      await registerRequest({ name: data.name, email: data.email, password: data.password });
      setDone(true);
    } catch (err) {
      setServerError(err);
    }
  }

  /*
   * Po rejestracji NIE logujemy automatycznie - wcześniej ta strona próbowała i musiała
   * kończyć się błędem. Rejestracja zwraca 202 i konto jeszcze nie istnieje: dane czekają
   * w poczekalni po stronie serwera do chwili kliknięcia w link z maila. Nie ma więc
   * czego zalogować.
   *
   * Komunikat jest celowo taki sam dla adresu wolnego i już zajętego. Serwer nie zdradza,
   * które adresy są zarejestrowane (właściciel skrzynki dostaje wtedy mail o próbie),
   * a front nie ma prawa tej zasady obchodzić własnym tekstem.
   */
  if (done) {
    return (
      <div className="card card-lg">
        <header className="card-head">
          <h1>Sprawdź skrzynkę</h1>
        </header>
        <Alert type="success">
          Jeśli można było założyć konto na podany adres, wysłaliśmy na niego link
          potwierdzający. Kliknij go, żeby dokończyć rejestrację. Link jest ważny 24 godziny.
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
        <h1>Załóż konto</h1>
        <p className="muted">Zajmie chwilę</p>
      </header>

      <form className="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <label className="field">
          <span className="label">Imię</span>
          <input
            className="input"
            type="text"
            autoComplete="given-name"
            {...register('name', { validate: (v) => nameError(v) ?? true })}
          />
          {errors.name && <span className="field-error">{errors.name.message}</span>}
        </label>

        <label className="field">
          <span className="label">Email</span>
          <input
            className="input"
            type="email"
            autoComplete="email"
            {...register('email', {
              validate: (v) => validateEmail(v) || 'Niepoprawny adres e-mail',
            })}
          />
          {errors.email && <span className="field-error">{errors.email.message}</span>}
        </label>

        <label className="field">
          <span className="label">Hasło</span>
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register('password', { validate: (v) => passwordError(v) ?? true })}
          />
          {errors.password ? (
            <span className="field-error">{errors.password.message}</span>
          ) : (
            <span className="field-hint">{PASSWORD_HINT}</span>
          )}
        </label>

        <label className="field">
          <span className="label">Powtórz hasło</span>
          {/* Drugi argument validate to komplet wartości formularza - dzięki temu nie trzeba
              obserwować pola hasła przez watch(), które nie współpracuje z kompilatorem Reacta. */}
          <input
            className="input"
            type="password"
            autoComplete="new-password"
            {...register('password2', {
              validate: (v, values) => v === values.password || 'Hasła nie są takie same',
            })}
          />
          {errors.password2 && <span className="field-error">{errors.password2.message}</span>}
        </label>

        <button className="button" type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Rejestrowanie…' : 'Zarejestruj'}
        </button>
      </form>

      {serverError && (
        <Alert type="error" traceId={serverError.traceId}>
          {serverError.message}
        </Alert>
      )}

      <div className="divider">albo</div>

      {/*
        Ten sam przycisk i ten sam adres co na logowaniu - różni się wyłącznie napisem.
        Dla Google rejestracja i logowanie to jedna operacja: konto po naszej stronie
        powstaje przy pierwszym udanym logowaniu, a jeśli adres ma już konto założone
        hasłem, oba zostają połączone. Konto z Google jest od razu aktywne i NIE dostaje
        maila potwierdzającego - adres potwierdziło już Google - więc ten przycisk
        celowo omija cały ekran "sprawdź skrzynkę" powyżej.
      */}
      <GoogleButton label="Zarejestruj się przez Google" />

      <footer className="card-foot">
        <span>
          Masz już konto? <Link to="/">Zaloguj się</Link>
        </span>
      </footer>
    </div>
  );
}
