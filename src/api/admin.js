/**
 * Panel administracyjny. Mechanika (ciasteczka, CSRF, ProblemDetail, ciche odświeżanie
 * tokenu) siedzi w client.js - tutaj są już tylko wywołania.
 *
 * Endpointy stoją pod ścieżką /users, a nie /admin/users: to reguła autoryzacji po stronie
 * serwera obejmuje właśnie ten prefiks i to ona chroni te wywołania, a front jedynie się pod
 * nią podpina. Adres /admin/users jest trasą w przeglądarce i nie ma związku z adresem API.
 *
 * Każda akcja oddaje konto po zmianie, więc ekran podmienia jeden wiersz zamiast
 * przeładowywać całą listę - i nie ma okna, w którym widok pokazuje stan sprzed akcji.
 */
import { request } from './client';

export function listUsers({ q = '', page = 0, size = 20 } = {}) {
  // Kodowanie parametru jest konieczne, bo fragment adresu może zawierać znaki o znaczeniu
  // składniowym - bez niego zapytanie rozpada się na parametry i serwer szuka czegoś innego.
  const query = q ? `&q=${encodeURIComponent(q)}` : '';
  return request(`/users?page=${page}&size=${size}${query}`);
}

export function getUser(id) {
  return request(`/users/${id}`);
}

/** Powód jest obowiązkowy - serwer odrzuca żądanie z pustą wartością. */
export function blockUser(id, reason) {
  return request(`/users/${id}/block`, { method: 'POST', body: { reason } });
}

export function unblockUser(id) {
  return request(`/users/${id}/unblock`, { method: 'POST' });
}

/** Zdejmuje blokadę po nieudanych logowaniach; nie rusza blokady administracyjnej. */
export function unlockUser(id) {
  return request(`/users/${id}/unlock`, { method: 'POST' });
}

/** Zrywa sesje, nie blokując konta. */
export function forceLogoutUser(id) {
  return request(`/users/${id}/logout`, { method: 'POST' });
}

/**
 * Kasuje konto razem z sesjami, zleceniami tłumaczenia i plikami. Operacja nieodwracalna.
 *
 * Jedyna akcja panelu, która nie oddaje konta po zmianie: po skasowaniu nie ma czego
 * pokazać, więc odpowiedź nie ma ciała, a ekran usuwa wiersz zamiast go podmieniać.
 * Pytanie o potwierdzenie należy do interfejsu, a nie do API: żaden dodatkowy krok po stronie
 * serwera nie powstrzyma kogoś, kto woła ten endpoint bezpośrednio.
 */
export function deleteUser(id) {
  return request(`/users/${id}`, { method: 'DELETE' });
}