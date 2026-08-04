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

const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:2009';

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

async function send(path, { method, body, allowRefresh, retried }) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';

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
      body: body === undefined ? undefined : JSON.stringify(body),
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

  // Token dostępowy żyje 15 minut. Jego wygaśnięcie to normalny stan przy dłuższej pracy,
  // a nie błąd - wymieniamy go po cichu i wracamy do pierwotnego żądania. Użytkownik
  // niczego nie zauważa. KAŻDY inny kod 401 oznacza ekran logowania.
  if (res.status === 401 && code === 'EXPIRED_TOKEN' && allowRefresh && !retried) {
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

  throw new ApiError(problem?.detail || 'Wystąpił nieoczekiwany błąd', {
    status: res.status,
    code,
    traceId: problem?.traceId ?? null,
  });
}
