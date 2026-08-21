/**
 * Endpointy API uwierzytelniania. Cała mechanika (ciasteczka, CSRF, ProblemDetail,
 * ciche odświeżanie tokenu) siedzi w client.js - tutaj są już tylko wywołania.
 */
import { request } from './client';

export function loginRequest({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

/**
 * Zgłasza rejestrację; konto jeszcze nie powstaje - dane czekają po stronie serwera
 * do czasu kliknięcia w link z wiadomości. Odpowiedź jest identyczna dla adresu wolnego
 * i już zajętego - o próbie dowiaduje się mailem właściciel skrzynki - więc front nie ma
 * jak - i nie powinien - rozróżniać tych przypadków.
 */
export function registerRequest({ name, email, password }) {
  return request('/auth/register', { method: 'POST', body: { name, email, password } });
}

export function confirmEmailRequest(token) {
  return request('/auth/confirm', { method: 'POST', body: { token } });
}

/**
 * Kim jestem. Jedyny sposób, żeby po odświeżeniu strony sprawdzić, czy sesja żyje:
 * ciasteczka są httpOnly, więc JavaScript ich nie odczyta.
 *
 * Odnawianie sesji pozostaje włączone także przy starcie aplikacji. Odpowiedź dla gościa
 * jest bowiem nie do odróżnienia od odpowiedzi dla kogoś, komu wygasło ciasteczko z tokenem
 * dostępowym, a to drugie zdarza się co kwadrans. Wyłączenie odnawiania odsyłałoby
 * zalogowanego użytkownika na ekran logowania przy każdym odświeżeniu strony po kwadransie,
 * mimo ważnego przez tydzień tokenu odnawiającego.


 */
export function meRequest({ allowRefresh = true } = {}) {
  return request('/auth/me', { allowRefresh });
}

/**
 * Unieważnia sesję po stronie serwera. Samo skasowanie ciasteczek nie wystarcza:
 * przechwycona wcześniej kopia tokenu odnawiającego działałaby dalej przez cały tydzień.
 */
export function logoutRequest() {
  return request('/auth/logout', { method: 'POST', allowRefresh: false });
}

/** Odpowiedź jest taka sama dla adresu znanego i nieznanego - to celowe. */
export function forgotPasswordRequest(email) {
  return request('/auth/forgot-password', { method: 'POST', body: { email } });
}

export function resetPasswordRequest({ token, password }) {
  return request('/auth/reset-password', { method: 'POST', body: { token, password } });
}
