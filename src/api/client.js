/**
 * Jedyne miejsce, przez które ta aplikacja rozmawia z API.
 *
 * Trzy rzeczy są tu obowiązkowe i żadna nie jest kosmetyką:
 *
 * 1. credentials: 'include' przy KAŻDYM wywołaniu. Tożsamość niesie ciasteczko httpOnly,
 *    nie nagłówek Authorization. Bez tej flagi fetch nie wyśle ciasteczek na inny origin
 *    (front stoi na :5173, API na :2009) i wszystko wraca 401 - objaw mylący, bo wygląda
 *    jak wygasła sesja, a ciasteczko po prostu nigdy nie wyszło z przeglądarki.
 *
 * 2. Token CSRF pobierany z GET /auth/csrf i odsyłany w NAGŁÓWKU. Ciasteczko XSRF-TOKEN
 *    jest httpOnly, więc JavaScript go nie odczyta - i nie musi. Przeglądarka dosyła
 *    ciasteczko sama, my dokładamy tę samą wartość w nagłówku, a serwer porównuje jedno
 *    z drugim. Dlatego token trzymamy w pamięci modułu, NIE w localStorage: przeżycie
 *    odświeżenia strony nic by nie dało (i tak pobieramy nowy), a byłby wystawiony na XSS.
 *
 * 3. Błędy przychodzą jako RFC 9457 ProblemDetail: { detail, status, code, traceId }.
 *    Komunikat siedzi w "detail", nie w "message". Rozgałęziać się należy po "code" -
 *    to stabilny identyfikator maszynowy, podczas gdy "detail" jest tekstem dla człowieka
 *    i może się zmienić w każdej chwili.
 */

/**
 * Eksportowane, bo logowanie przez Google NIE idzie przez fetch, tylko przez zwykłą
 * nawigację przeglądarki (patrz auth/google.js) - a adres trzeba złożyć z tej samej
 * podstawy co reszta wywołań, żeby nie istniały dwa źródła prawdy o tym, gdzie stoi API.
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
 * traceId niesiemy aż na ekran, bo to jedyny sposób, żeby użytkownik zgłaszający
 * "nie działa" mógł podać coś, po czym da się odnaleźć jego żądanie w logach serwera.
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

async function parseBody(res) {
  if (res.status === 204) return null;
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

/** Pobiera świeży token CSRF. Odpowiedź niesie też nazwę nagłówka, w którym go odesłać. */
async function loadCsrf() {
  const res = await fetch(`${API_BASE}/auth/csrf`, { credentials: 'include' });
  if (!res.ok) {
    throw new ApiError('Nie udało się nawiązać połączenia z serwerem', { status: res.status });
  }
  csrf = await res.json();
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
 * DLACZEGO NIE ZWYKŁY <a href download>: przeglądarka IGNORUJE atrybut download przy
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
    throw new ApiError('Brak połączenia z serwerem. Sprawdź, czy backend działa.', {
      code: 'NETWORK_ERROR',
    });
  }

  if (!res.ok) {
    const problem = await parseBody(res);
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
    // fetch rzuca tylko przy błędzie sieci - serwer nieuruchomiony, brak internetu, CORS
    throw new ApiError('Brak połączenia z serwerem. Sprawdź, czy backend działa.', {
      code: 'NETWORK_ERROR',
    });
  }

  if (res.ok) return parseBody(res);

  const problem = await parseBody(res);
  const code = problem?.code ?? null;

  // Token CSRF przeterminowany albo wymieniony przez serwer - pobieramy nowy i ponawiamy
  // dokładnie raz. Serwer wystawia na to osobny kod właśnie po to, żeby front mógł
  // spróbować ponownie, zamiast wylogowywać użytkownika.
  if (res.status === 403 && code === 'CSRF_TOKEN_INVALID' && !retried) {
    await loadCsrf();
    return send(path, { method, body, allowRefresh, retried: true });
  }

  /*
   * Token dostępowy żyje 15 minut. Jego wygaśnięcie to normalny stan przy dłuższej pracy,
   * a nie błąd - wymieniamy go po cichu i wracamy do pierwotnego żądania.
   *
   * DWA KODY, NIE JEDEN - i to jest sedno. EXPIRED_TOKEN w PRZEGLĄDARCE nie występuje
   * praktycznie nigdy: żeby serwer go zwrócił, żądanie musiałoby NIEŚĆ token po terminie,
   * a ciasteczko accessToken ma max-age równe ważności tokenu, więc znika dokładnie w tej
   * samej chwili, w której token przestaje być ważny. Żądanie leci wtedy BEZ ciasteczka
   * i dostaje UNAUTHENTICATED - ten sam kod co gość, który nigdy się nie logował.
   *
   * Warunek tylko na EXPIRED_TOKEN nie mógł się więc spełnić i skutek był taki, że
   * siedmiodniowy token odświeżający nie był używany NIGDY: po 15 minutach każda akcja
   * cicho zwracała 401, a odświeżenie strony wyrzucało na ekran logowania. Objaw mylił,
   * bo wyglądał na krótką ważność sesji, a nie na nieużywany mechanizm odnowienia.
   * Znalezione 2026-08-16 przy ręcznym przeklikiwaniu panelu, gdy sesja padła w połowie.
   *
   * CENA, PRZYJĘTA ŚWIADOMIE: gość również dostaje UNAUTHENTICATED, więc jego wejście
   * kosztuje teraz dwa dodatkowe żądania (GET /auth/csrf + POST /auth/refresh), zanim
   * zobaczy ekran logowania. Odróżnić gościa od wygasłej sesji NIE DA SIĘ po stronie
   * frontu - ciasteczka są httpOnly - a flaga w localStorage kłama w obie strony
   * (uzasadnienie w AuthContext). Dwa żądania raz na wejście są tańsze niż sesja
   * umierająca co kwadrans.
   *
   * Refresh idzie z allowRefresh: false, więc jego własne 401 (REFRESH_TOKEN_MISSING)
   * nie zawraca tu ponownie.
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

  throw new ApiError(problem?.detail || 'Wystąpił nieoczekiwany błąd', {
    status: res.status,
    code,
    traceId: problem?.traceId ?? null,
  });
}
