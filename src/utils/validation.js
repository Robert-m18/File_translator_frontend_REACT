/**
 * Reguły lustrzane wobec @ValidPassword po stronie serwera (min 8, max 72, litera + cyfra).
 *
 * Poprzednia wersja przepuszczała hasła 6-znakowe, więc użytkownik dostawał 400 dopiero
 * po wysłaniu formularza. Walidacja we froncie NIE jest zabezpieczeniem - serwer i tak
 * sprawdza wszystko od nowa - ale ma nie kłamać co do wymagań.
 *
 * Górne 72 znaki nie są widzimisię: BCrypt ucina wejście po 72 bajtach, więc dłuższe
 * hasło daje fałszywe poczucie bezpieczeństwa.
 */
export const PASSWORD_HINT = 'Min. 8 znaków, w tym co najmniej jedna litera i jedna cyfra';

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
}

export function passwordError(password) {
  if (typeof password !== 'string' || password.length === 0) return 'Hasło nie może być puste';
  if (password.length < 8) return 'Hasło musi mieć co najmniej 8 znaków';
  if (password.length > 72) return 'Hasło może mieć maksymalnie 72 znaki';
  if (!/(?=.*[a-zA-Z])(?=.*\d)/.test(password)) {
    return 'Hasło musi zawierać co najmniej jedną literę i jedną cyfrę';
  }
  return null;
}

export function validatePassword(password) {
  return passwordError(password) === null;
}

export function nameError(name) {
  const value = String(name ?? '').trim();
  if (value.length < 2) return 'Imię musi mieć co najmniej 2 znaki';
  if (value.length > 50) return 'Imię może mieć maksymalnie 50 znaków';
  return null;
}
