/**
 * Endpointy API uwierzytelniania. Cała mechanika (ciasteczka, CSRF, ProblemDetail,
 * ciche odświeżanie tokenu) siedzi w client.js - tutaj są już tylko wywołania.
 */
import { request } from './client';

export function loginRequest({ email, password }) {
  return request('/auth/login', { method: 'POST', body: { email, password } });
}

/**
 * Zwraca 202 i NIE zakłada jeszcze konta - dane czekają w poczekalni po stronie serwera
 * do czasu kliknięcia w link z maila. Odpowiedź jest identyczna dla adresu wolnego
 * i już zajętego (o próbie dowiaduje się mailem właściciel skrzynki), więc front nie ma
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
 * allowRefresh: false przy starcie aplikacji - tu 401 to normalna odpowiedź dla gościa,
 * a nie sytuacja do ratowania odświeżaniem tokenu.
 */
export function meRequest({ allowRefresh = true } = {}) {
  return request('/auth/me', { allowRefresh });
}

/**
 * Unieważnia sesję PO STRONIE SERWERA. Samo skasowanie ciasteczek nie wystarcza:
 * przechwycona wcześniej kopia tokenu odświeżającego działałaby dalej przez 7 dni.
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
