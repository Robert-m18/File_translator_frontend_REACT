/**
 * Logowanie kontem Google - wszystko, co front o nim wie, w jednym miejscu.
 *
 * Moduł zawiera dwie rzeczy: adres, pod który trzeba nawigować, oraz tłumaczenie kodów
 * odmowy na komunikaty dla użytkownika.
 */
import { API_BASE } from '../api/client';

/**
 * Adres rozpoczynający przepływ OAuth2.
 *
 * Adres musi zostać otwarty zwykłą nawigacją przeglądarki, a nie wywołaniem API, i jest to
 * jedyna pułapka tego modułu. Serwer odpowiada przekierowaniem na stronę dostawcy tożsamości,
 * gdzie użytkownik ma zobaczyć ekran zgody. Wywołanie API przekierowanie wprawdzie wykona,
 * ale wynik trafi do zmiennej w skrypcie zamiast do paska adresu, a dodatkowo odbije się
 * o politykę CORS, bo domena dostawcy nie wystawia odpowiednich nagłówków. Objaw byłby
 * mylący: przycisk pozornie nic nie robi, a błąd w konsoli wskazuje na konfigurację API,
 * które w tej wymianie nie bierze już udziału.
 *
 * Reszta jest po stronie serwera: Google wraca na /login/oauth2/code/google, backend
 * wystawia te same ciasteczka co logowanie hasłem i odsyła przeglądarkę na front.
 * Dlatego po powrocie nie ma czego odbierać - zwykłe sprawdzenie sesji przy starcie
 * aplikacji zastaje już żywą sesję.
 */
export function googleLoginUrl() {
  return `${API_BASE}/oauth2/authorization/google`;
}

/**
 * Kody odmowy, które backend dokleja do adresu powrotnego jako ?error=.
 *
 * Kody przychodzą w adresie, a nie w ciele odpowiedzi, ponieważ przeglądarka jest wtedy
 * w trakcie nawigacji, więc surowy dokument JSON wylądowałby użytkownikowi na ekranie.
 * Rozgałęzienie idzie po kodzie, a nie po tekście, tak samo jak przy zwykłych błędach API.
 */
const MESSAGES = {
  /*
   * Serwer odmawia, dopóki dostawca nie potwierdzi adresu, ponieważ to właśnie potwierdzony
   * adres łączy konto zewnętrzne z kontem założonym hasłem. Bez tej odmowy wystarczyłoby
   * założyć konto u dostawcy na cudzy adres, żeby przejąć cudze konto.
   */
  GOOGLE_EMAIL_NOT_VERIFIED:
    'To konto Google nie ma potwierdzonego adresu e-mail, więc nie możemy go użyć do logowania. ' +
    'Potwierdź adres w ustawieniach konta Google albo zaloguj się hasłem.',

  /*
   * Ten sam kod, który zwraca logowanie hasłem i filtr uwierzytelniający - dla frontu jest to
   * jeden stan i jedna reakcja, niezależnie od tego, którą drogą użytkownik próbował wejść.
   * Blokada nie mija sama, więc nie ma tu czego ponawiać.
   */
  ACCOUNT_BLOCKED:
    'To konto zostało zablokowane przez administratora. Skontaktuj się z obsługą, ' +
    'jeśli uważasz, że to pomyłka.',

  /*
   * Zbiorczy: odmowa zgody na ekranie Google, zużyty kod autoryzacyjny, wygasłe żądanie,
   * awaria po stronie dostawcy. Serwer celowo ich nie rozróżnia w adresie, ponieważ reakcja
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
