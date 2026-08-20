/**
 * Logowanie kontem Google — wszystko, co front o nim wie, w jednym miejscu.
 *
 * Odpowiednik backendowego pakietu auth/oauth2/. Dwie rzeczy: adres, pod który trzeba
 * NAWIGOWAĆ, i tłumaczenie kodów odmowy na zdania dla człowieka.
 */
import { API_BASE } from '../api/client';

/**
 * Adres rozpoczynający przepływ OAuth2.
 *
 * MUSI być użyty przez window.location, a NIE przez fetch — i to jest tu jedyna
 * pułapka warta zapamiętania. Serwer odpowiada przekierowaniem na accounts.google.com,
 * gdzie użytkownik ma zobaczyć ekran zgody Google. fetch przekierowanie owszem wykona,
 * ale wynik wyląduje w zmiennej w JavaScripcie zamiast w pasku adresu — a do tego
 * odbije się o CORS, bo domena Google nie wystawia nam nagłówków. Objaw byłby mylący:
 * "przycisk nic nie robi" plus błąd CORS w konsoli, wskazujący na konfigurację naszego
 * API, które w tej wymianie nie bierze już udziału.
 *
 * Reszta jest po stronie serwera: Google wraca na /login/oauth2/code/google, backend
 * wystawia TE SAME ciasteczka co POST /auth/login i odsyła przeglądarkę na front.
 * Dlatego po powrocie nie ma czego "odbierać" — zwykłe GET /auth/me z AuthContext
 * zastaje już żywą sesję.
 */
export function googleLoginUrl() {
  return `${API_BASE}/oauth2/authorization/google`;
}

/**
 * Kody odmowy, które backend dokleja do adresu powrotnego jako ?error=.
 *
 * Przychodzą w ADRESIE, a nie w ciele ProblemDetail, bo przeglądarka jest wtedy
 * w trakcie nawigacji — surowy JSON wylądowałby użytkownikowi na ekranie. Rozgałęziamy
 * się po KODZIE, nie po tekście, tak samo jak przy zwykłych błędach API.
 */
const MESSAGES = {
  /*
   * Backend odmawia, dopóki Google nie potwierdzi adresu — bo to właśnie potwierdzony
   * adres łączy konto Google z kontem założonym hasłem. Bez tej odmowy wystarczyłoby
   * założyć konto Google na cudzy adres, żeby przejąć cudze konto.
   */
  GOOGLE_EMAIL_NOT_VERIFIED:
    'To konto Google nie ma potwierdzonego adresu e-mail, więc nie możemy go użyć do logowania. ' +
    'Potwierdź adres w ustawieniach konta Google albo zaloguj się hasłem.',

  /*
   * Ten sam kod, który dostaje logowanie hasłem i JwtFilter — dla frontu to jeden stan
   * i jedna reakcja, niezależnie od tego, którą drogą użytkownik próbował wejść.
   * Blokada nie mija sama, więc nie ma tu czego ponawiać.
   */
  ACCOUNT_BLOCKED:
    'To konto zostało zablokowane przez administratora. Skontaktuj się z obsługą, ' +
    'jeśli uważasz, że to pomyłka.',

  /*
   * Zbiorczy: odmowa zgody na ekranie Google, zużyty kod autoryzacyjny, wygasłe żądanie,
   * awaria po stronie dostawcy. Backend celowo ich nie rozróżnia w adresie — reakcja
   * użytkownika jest zawsze ta sama, a szczegóły przebiegu nie są dla niego.
   */
  GOOGLE_AUTH_FAILED: 'Logowanie przez Google nie powiodło się. Spróbuj ponownie.',
};

/**
 * @param {string|null} code wartość parametru ?error= albo null
 * @returns {string|null} komunikat do pokazania, albo null gdy nie ma czego pokazywać
 */
export function googleErrorMessage(code) {
  if (!code) return null;
  // Nieznany kod też dostaje komunikat: parametr w adresie ustawia kto chce, a milczenie
  // przy nierozpoznanej wartości zostawiłoby użytkownika bez żadnej informacji zwrotnej.
  return MESSAGES[code] ?? MESSAGES.GOOGLE_AUTH_FAILED;
}
