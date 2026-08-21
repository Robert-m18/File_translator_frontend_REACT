/**
 * Jedyne miejsce, przez które ta aplikacja rozmawia z API.
 *
 * Trzy zasady obowiązują tu bezwyjątkowo:
 *
 * 1. Każde wywołanie dołącza ciasteczka. Tożsamość niesie ciasteczko niedostępne dla
 *    JavaScriptu, a nie nagłówek autoryzacji, więc bez tej flagi przeglądarka nie wyśle go na
 *    inny origin i wszystkie odpowiedzi wracają jako brak uwierzytelnienia - objaw mylący, bo
 *    wygląda jak wygasła sesja, choć ciasteczko po prostu nie opuściło przeglądarki.
 *
 * 2. Token CSRF pobierany jest osobnym żądaniem i odsyłany w nagłówku. Ciasteczko z tokenem
 *    jest niedostępne dla skryptów, więc przeglądarka dosyła je sama, aplikacja dokłada tę samą
 *    wartość w nagłówku, a serwer porównuje jedno z drugim. Token trzymany jest w pamięci
 *    modułu, a nie w pamięci trwałej przeglądarki: przetrwanie odświeżenia strony niczego by
 *    nie dało, bo i tak pobierany jest nowy, a wartość byłaby wystawiona na ataki skryptowe.
 *
 * 3. Błędy przychodzą w formacie RFC 9457. Komunikat dla człowieka znajduje się w polu opisu,
 *    natomiast rozgałęziać się należy po kodzie maszynowym - opis jest tekstem, który może
 *    zmienić się w każdej chwili.
 */

/**
 * Eksportowane, ponieważ logowanie przez Google nie idzie przez wywołanie API, tylko przez
 * zwykłą nawigację przeglądarki, a adres trzeba złożyć z tej samej podstawy co reszta
 * wywołań, żeby nie istniały dwa źródła prawdy o tym, gdzie stoi API.
 */
export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2009';

/** Token CSRF w pamięci modułu. Ginie przy odświeżeniu strony - i dobrze. */
let csrf = null;

/** Wołane, gdy serwer ostatecznie odmówił uwierzytelnienia (AuthContext czyści wtedy stan). */
let onSessionLost = () => {};
export function setSessionLostHandler(fn) {
  onSessionLost = fn;
}

/**
 * Błąd API z zachowanym kodem maszynowym i traceId.
 *
 * Identyfikator żądania trafia aż na ekran, bo jest jedynym sposobem, żeby użytkownik
 * zgłaszający problem mógł podać coś, po czym da się odnaleźć jego żądanie w logach serwera.
 */
export class ApiError extends Error {
  constructor(message, { status = 0, code = null, traceId = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.traceId = traceId;
  }
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Buduje komunikat na wypadek, gdy z serwerem nie da się porozmawiać.
 *
 * Jedna funkcja zamiast powtórzonego tekstu w każdym miejscu wołającym żądanie: kopie
 * rozjechałyby się przy pierwszej zmianie treści i użytkownik dostawałby inny komunikat przy
 * logowaniu, a inny przy pobieraniu pliku.
 *
 * Treść jest adresowana do użytkownika, a nie do programisty. Rada w rodzaju "sprawdź, czy
 * backend działa" ma sens wyłącznie dla kogoś, kto ma ten backend na własnym dysku; osoba
 * korzystająca z aplikacji nie ma czego sprawdzić, więc jedyne, co może zrobić, to spróbować
 * później.
 *
 * Świadome uproszczenie: przeglądarka zgłasza ten sam błąd przy wyłączonym serwerze, zerwanym
 * łączu i odbiciu polityki CORS, a rozróżnienie tych przypadków jest z poziomu strony
 * niemożliwe - to celowe ograniczenie, żeby strona nie mogła skanować sieci. Komunikat wskazuje
 * więc na stronę aplikacji, mimo że wina bywa po drugiej: przy jej awarii jest to prawda, a przy
 * cudzej użytkownik i tak nie ma czego naprawić, natomiast rada "sprawdź połączenie" przy
 * działającym internecie wysyła go w bezowocną pogoń.
 */
function serverUnreachable(traceId = null) {
  return new ApiError(
    'Błąd serwera - to problem po naszej stronie. Spróbuj ponownie za parę minut.',
    { code: 'NETWORK_ERROR', traceId },
  );
}

/**
 * Awaria serwera, która ma postać odpowiedzi HTTP.
 *
 * Przypadek odrębny od powyższego, bo serwer odpowiedział - tyle że bez ciała albo ciałem,
 * którego nie da się odczytać, bo stronę błędu potrafi podstawić proxy stojące przed
 * aplikacją. Gdy ciało jest poprawnym opisem błędu, pierwszeństwo ma zawarty w nim opis:
 * serwer podaje tam konkretniejszy komunikat niż cokolwiek, co dałoby się napisać tutaj
 * na zapas.
 *
 * Identyfikator żądania jest przekazywany dalej, jeśli przyszedł - to jedyna rzecz, po której
 * da się odnaleźć żądanie w logach, więc nie wolno jej zgubić właśnie przy awarii.
 */
function serverFault(status, traceId) {
  return new ApiError(
    'Błąd serwera - to problem po naszej stronie. Spróbuj ponownie za parę minut.',
    { status, code: 'SERVER_ERROR', traceId },
  );
}

async function parseBody(res) {
  if (res.status === 204) return null;

  // res.text() też potrafi rzucić - gdy połączenie padnie w trakcie czytania ciała.
  // Sytuacja traktowana jest jak brak ciała, bo wołający ma już status odpowiedzi i poradzi
  // sobie bez treści; nieosłonięte dałoby surowy wyjątek przeglądarki na ekranie.
  let text;
  try {
    text = await res.text();
  } catch {
    return null;
  }

  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/**
 * Pobiera świeży token CSRF. Odpowiedź niesie też nazwę nagłówka, w którym go odesłać.
 *
 * Wywołanie jest osłonięte własną obsługą błędów, ponieważ wykonuje się przed każdym żądaniem
 * zmieniającym stan, czyli wcześniej niż osłonięte żądanie właściwe. Przy niedziałającym
 * serwerze nieosłonięty błąd wychodziłby właśnie stąd i trafiał na ekran jako surowy komunikat
 * przeglądarki - w dodatku wyłącznie po kliknięciu przycisku, podczas gdy samo wejście na stronę
 * pokazywałoby komunikat poprawny, co wygląda na błąd formularza, a nie na brak serwera.
 */
async function loadCsrf() {
  let res;
  try {
    res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  } catch {
    throw serverUnreachable();
  }

  if (!res.ok) {
    // Serwer odpowiedział, ale nie tokenem. Bez tokenu nie da się iść dalej,
    // bez tokenu każde żądanie zmieniające stan odbije się o CSRF.
    throw serverFault(res.status, null);
  }

  try {
    csrf = await res.json();
  } catch {
    // Odpowiedź poprawna, ale z ciałem, które nie jest dokumentem JSON, to prawie na pewno
    // strona podstawiona przez proxy albo portal przechwytujący ruch - nieodróżnialne od awarii.
    throw serverFault(res.status, null);
  }
  return csrf;
}

/**
 * @param {string} path      ścieżka, np. '/auth/login'
 * @param {object} options
 * @param {'GET'|'POST'} [options.method]
 * @param {object} [options.body]        zostanie zserializowany do JSON
 * @param {boolean} [options.allowRefresh=true]  czy przy wygasłym tokenie spróbować cichego odświeżenia
 */
export async function request(path, { method = 'GET', body, allowRefresh = true } = {}) {
  return send(path, { method, body, allowRefresh, retried: false });
}

/**
 * Wysyła plik jako multipart/form-data.
 *
 * Osobna funkcja, bo request() serializuje ciało do JSON-a, a plik JSON-em nie jest.
 * Cała reszta mechaniki - token CSRF, ciasteczka, ciche odświeżenie tokenu, ProblemDetail -
 * jest ta sama, więc idzie przez to samo send().
 *
 * @param {string} path
 * @param {FormData} formData
 */
export async function upload(path, formData) {
  return send(path, { method: 'POST', body: formData, allowRefresh: true, retried: false });
}

/**
 * Pobiera plik i oddaje go razem z nazwą zaproponowaną przez serwer.
 *
 * Zwykły odnośnik pobierania nie wystarcza: przeglądarka ignoruje atrybut pobierania przy
 * odnośniku na inny origin (front stoi na :5173, API na :2009), więc plik otworzyłby się
 * w karcie zamiast zapisać. Zwykła nawigacja omija też całą obsługę błędów - zamiast
 * komunikatu użytkownik zobaczyłby surowy JSON na białej stronie.
 *
 * Nazwę czytamy z Content-Disposition. Serwer koduje ją zgodnie z RFC 5987
 * (filename*=UTF-8''...), bo nazwy plików bywają z polskimi znakami.
 */
export async function downloadFile(path) {
  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, { credentials: 'include' });
  } catch {
    throw serverUnreachable();
  }

  if (!res.ok) {
    const problem = await parseBody(res);
    // Ta sama zasada co w send(): awaria serwera dostaje komunikat mówiący, że to nie
    // użytkownik zawinił i że warto spróbować później. "Nie udało się pobrać pliku"
    // zostaje dla odpowiedzi, które NIE są awarią - np. 410 CONTENT_EXPIRED.
    if (res.status >= 500 && !problem?.detail) {
      throw serverFault(res.status, problem?.traceId ?? null);
    }
    throw new ApiError(problem?.detail || 'Nie udało się pobrać pliku', {
      status: res.status,
      code: problem?.code ?? null,
      traceId: problem?.traceId ?? null,
    });
  }

  return {
    blob: await res.blob(),
    filename: filenameFrom(res.headers.get('Content-Disposition')),
  };
}

function filenameFrom(disposition) {
  if (!disposition) return 'tlumaczenie.txt';

  // Wariant RFC 5987 ma pierwszeństwo - tylko on niesie znaki spoza ASCII
  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(disposition);
  if (encoded) return decodeURIComponent(encoded[1]);

  const plain = /filename="?([^";]+)"?/i.exec(disposition);
  return plain ? plain[1] : 'tlumaczenie.txt';
}

async function send(path, { method, body, allowRefresh, retried }) {
  const headers = {};

  // FormData NIE dostaje Content-Type: przeglądarka musi ustawić go sama, razem z granicą
  // (boundary) części. Ustawienie go ręcznie psuje parsowanie po stronie serwera -
  // żądanie dochodzi, ale pola są puste, co wygląda jak błąd walidacji.
  const isMultipart = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && !isMultipart) headers['Content-Type'] = 'application/json';

  // Żądania zmieniające stan wymagają tokenu CSRF. GET-y nie - CsrfFilter po stronie
  // Springa przepuszcza GET/HEAD/OPTIONS/TRACE bez sprawdzania.
  if (!SAFE_METHODS.has(method)) {
    if (!csrf) await loadCsrf();
    headers[csrf.headerName] = csrf.token;
  }

  let res;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: 'include',
      body: body === undefined || isMultipart ? body : JSON.stringify(body),
    });
  } catch {
    // Wyjątek na tym poziomie oznacza wyłącznie błąd sieci: brak serwera, brak łącza albo CORS.
    throw serverUnreachable();
  }

  if (res.ok) return parseBody(res);

  const problem = await parseBody(res);
  const code = problem?.code ?? null;

  // Token CSRF przeterminowany albo wymieniony przez serwer - pobierany jest nowy, a żądanie
  // ponawiane dokładnie raz. Serwer wystawia na to osobny kod właśnie po to, żeby front mógł
  // spróbować ponownie, zamiast wylogowywać użytkownika.
  if (res.status === 403 && code === 'CSRF_TOKEN_INVALID' && !retried) {
    await loadCsrf();
    return send(path, { method, body, allowRefresh, retried: true });
  }

  /*
   * Token dostępowy żyje kwadrans, więc jego wygaśnięcie jest normalnym stanem przy dłuższej
   * pracy, a nie błędem: sesja jest wtedy odnawiana po cichu, a pierwotne żądanie ponawiane.
   *
   * Warunek obejmuje dwa kody, i to jest tu sedno. Kod oznaczający wygasły token praktycznie
   * nie występuje w przeglądarce: żeby serwer go zwrócił, żądanie musiałoby nieść token po
   * terminie, a ciasteczko ma czas życia równy ważności tokenu, więc znika dokładnie w chwili,
   * w której token przestaje być ważny. Żądanie leci wtedy bez ciasteczka i dostaje ten sam kod
   * co gość, który nigdy się nie logował. Warunek zawężony do samego wygaśnięcia nie mógłby się
   * więc spełnić, a tygodniowy token odświeżający nie byłby używany nigdy - po kwadransie każda
   * akcja cicho kończyłaby się odmową, a odświeżenie strony wyrzucało na ekran logowania.
   *
   * Świadomie przyjęta cena: gość również dostaje ten kod, więc jego wejście kosztuje dwa
   * dodatkowe żądania, zanim zobaczy ekran logowania. Odróżnienie gościa od wygasłej sesji po
   * stronie przeglądarki nie jest możliwe, bo ciasteczka są niedostępne dla skryptów, a flaga
   * w pamięci trwałej przeglądarki kłamie w obie strony. Dwa żądania raz na wejście są tańsze
   * niż sesja umierająca co kwadrans.
   *
   * Samo odnowienie sesji idzie z wyłączonym ponawianiem, więc jego własna odmowa nie zawraca
   * tu ponownie.
   */
  const staleAccessToken = code === 'EXPIRED_TOKEN' || code === 'UNAUTHENTICATED';

  if (res.status === 401 && staleAccessToken && allowRefresh && !retried) {
    try {
      await send('/auth/refresh', { method: 'POST', allowRefresh: false, retried: false });
      return send(path, { method, body, allowRefresh: false, retried: true });
    } catch {
      onSessionLost();
      throw new ApiError('Sesja wygasła. Zaloguj się ponownie.', {
        status: 401,
        code: 'SESSION_EXPIRED',
        traceId: problem?.traceId ?? null,
      });
    }
  }

  // Konto zablokowane przez administratora w TRAKCIE pracy. Bez tej gałęzi użytkownik
  // zostaje na ekranie, który przy każdej akcji sypie błędami, i nie ma jak się domyślić,
  // że ma iść na logowanie. Nie ma tu czego ponawiać - blokada nie mija sama.
  if (res.status === 401 && code === 'ACCOUNT_BLOCKED') {
    onSessionLost();
  }

  /*
   * Awaria po stronie serwera. Bez tej gałęzi odpowiedzi wystawiane przez proxy - a więc bez
   * ustandaryzowanego opisu błędu, bo aplikacja w ogóle ich nie wygenerowała - wpadałyby na
   * komunikat ogólny: zdanie prawdziwe, ale nieodróżnialne od błędu walidacji i nieniosące
   * jedynej użytecznej informacji, czyli tego, że warto spróbować później.
   *
   * Pierwszeństwo ma opis z ciała odpowiedzi: gdy serwer odpowie błędem wraz z poprawnym
   * opisem, jest on konkretniejszy niż cokolwiek napisanego tutaj na zapas.
   */
  if (res.status >= 500 && !problem?.detail) {
    throw serverFault(res.status, problem?.traceId ?? null);
  }

  throw new ApiError(problem?.detail || 'Wystąpił nieoczekiwany błąd', {
    status: res.status,
    code,
    traceId: problem?.traceId ?? null,
  });
}
