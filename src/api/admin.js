/**
 * Panel administracyjny. Mechanika (ciasteczka, CSRF, ProblemDetail, ciche odświeżanie
 * tokenu) siedzi w client.js - tutaj są już tylko wywołania.
 *
 * ŚCIEŻKA TO /users, A NIE /admin/users. Po stronie serwera reguła
 * .requestMatchers("/users/**").hasRole("ADMIN") jest tym, co chroni te endpointy;
 * front jedynie się pod nią podpina. Adres /admin/users to trasa w PRZEGLĄDARCE
 * (App.jsx) i nie ma nic wspólnego z adresem API.
 *
 * Każda akcja oddaje konto PO ZMIANIE, więc ekran podmienia jeden wiersz zamiast
 * przeładowywać całą listę - i nie ma okna, w którym widok pokazuje stan sprzed akcji.
 */
import { request } from './client';

export function listUsers({ q = '', page = 0, size = 20 } = {}) {
  // encodeURIComponent, bo fragment adresu może zawierać "&", "+" albo "%" - bez tego
  // zapytanie rozjeżdża się na parametry i serwer szuka czegoś innego, niż wpisano.
  const query = q ? `&q=${encodeURIComponent(q)}` : '';
  return request(`/users?page=${page}&size=${size}${query}`);
}

export function getUser(id) {
  return request(`/users/${id}`);
}

/** Powód jest OBOWIĄZKOWY - serwer odrzuci pusty (400 VALIDATION_FAILED). */
export function blockUser(id, reason) {
  return request(`/users/${id}/block`, { method: 'POST', body: { reason } });
}

export function unblockUser(id) {
  return request(`/users/${id}/unblock`, { method: 'POST' });
}

/** Zdejmuje blokadę po nieudanych logowaniach. NIE zdejmuje blokady administracyjnej. */
export function unlockUser(id) {
  return request(`/users/${id}/unlock`, { method: 'POST' });
}

/** Zrywa sesje, nie blokując konta. */
export function forceLogoutUser(id) {
  return request(`/users/${id}/logout`, { method: 'POST' });
}

/**
 * Kasuje konto razem z sesjami, zleceniami tłumaczenia i plikami. NIEODWRACALNE.
 *
 * Jedyna akcja panelu, która NIE oddaje konta po zmianie - po skasowaniu nie ma czego
 * pokazać, więc serwer odpowiada 204 bez ciała, a ekran usuwa wiersz zamiast go podmieniać.
 * Pytanie "czy na pewno" stoi w AdminUsers.jsx: to sprawa interfejsu, a nie API, bo żaden
 * dodatkowy krok po stronie serwera nie powstrzyma kogoś, kto woła to curlem.
 */
export function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}