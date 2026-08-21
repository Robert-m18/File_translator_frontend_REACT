/**
 * Mechanika rozmowy z API: ciasteczka, token CSRF, ciche odnowienie sesji i kształt błędów.
 *
 * To jest plik, w którym ten front miał najwięcej defektów, i wszystkie miały tę samą cechę:
 * objaw wskazywał gdzie indziej niż przyczyna. Sesja umierająca co kwadrans wyglądała na krótką
 * ważność tokenu, a nie na nieużywany mechanizm odnowienia; brak serwera wyglądał na błąd
 * konkretnego formularza, bo surowy komunikat przeglądarki wyciekał tylko z jednej ścieżki.
 * Dlatego testy są tu na zachowaniu obserwowalnym z zewnątrz - jakie żądania poszły i w jakiej
 * kolejności - a nie na wnętrzu modułu.
 *
 * Moduł trzyma token CSRF w zmiennej modułowej, więc każdy test dostaje ŚWIEŻĄ kopię modułu.
 * Bez tego token pobrany w jednym teście przeżyłby do następnego i połowa asercji o kolejności
 * żądań przestałaby cokolwiek znaczyć - zależnie od kolejności wykonania plików.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const CSRF = { headerName: 'X-XSRF-TOKEN', token: 'token-csrf' };

/** Odpowiedź HTTP w kształcie, którego używa client.js: text() do ciała, json() do tokenu CSRF. */
function odpowiedz(status, cialo) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => (cialo === undefined ? '' : JSON.stringify(cialo)),
    json: async () => cialo,
    headers: { get: () => null },
  };
}

function problem(code, { detail = 'Komunikat serwera', traceId = 'trace-1' } = {}) {
  return { detail, code, traceId };
}

/** Ścieżki kolejnych wywołań fetch - po nich sprawdzamy, co i w jakiej kolejności poleciało. */
function sciezki(fetchMock) {
  return fetchMock.mock.calls.map(([url]) => new URL(url).pathname);
}

let client;
let fetchMock;

beforeEach(async () => {
  vi.resetModules();
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
  client = await import('./client.js');
});

describe('ciasteczka i token CSRF', () => {
  /*
   * Tożsamość niesie ciasteczko httpOnly, nie nagłówek. Bez tej flagi przeglądarka nie wyśle
   * ciasteczek na inny origin i KAŻDE żądanie wraca 401 - objaw nie do odróżnienia od wygasłej
   * sesji, mimo że ciasteczko nigdy nie opuściło przeglądarki.
   */
  it('każde żądanie idzie z ciasteczkami', async () => {
    fetchMock.mockResolvedValueOnce(odpowiedz(200, { id: 1 }));

    await client.request('/auth/me');

    expect(fetchMock.mock.calls[0][1].credentials).toBe('include');
  });

  it('GET nie pobiera tokenu CSRF - filtr po stronie serwera przepuszcza metody bezpieczne', async () => {
    fetchMock.mockResolvedValueOnce(odpowiedz(200, { id: 1 }));

    await client.request('/auth/me');

    expect(sciezki(fetchMock)).toEqual(['/auth/me']);
  });

  /*
   * Ciasteczko z tokenem jest httpOnly, więc JavaScript go nie odczyta - i nie musi.
   * Przeglądarka dosyła ciasteczko sama, my dokładamy tę samą wartość w nagłówku, a serwer
   * porównuje jedno z drugim. Nazwa nagłówka pochodzi z odpowiedzi serwera, nie z kodu.
   */
  it('żądanie zmieniające stan najpierw pobiera token, potem odsyła go w nagłówku', async () => {
    fetchMock
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(200, { ok: true }));

    await client.request('/auth/login', { method: 'POST', body: { email: 'a@b.pl' } });

    expect(sciezki(fetchMock)).toEqual(['/auth/csrf', '/auth/login']);
    expect(fetchMock.mock.calls[1][1].headers[CSRF.headerName]).toBe(CSRF.token);
  });

  it('token pobierany jest raz i używany przy kolejnych żądaniach', async () => {
    fetchMock
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(200, { ok: true }))
      .mockResolvedValueOnce(odpowiedz(200, { ok: true }));

    await client.request('/auth/login', { method: 'POST', body: {} });
    await client.request('/auth/logout', { method: 'POST', allowRefresh: false });

    expect(sciezki(fetchMock)).toEqual(['/auth/csrf', '/auth/login', '/auth/logout']);
  });

  /*
   * Serwer wystawia na nieważny token osobny kod właśnie po to, żeby front mógł pobrać nowy
   * i powtórzyć żądanie, zamiast wylogowywać użytkownika. Powtórzenie jest DOKŁADNIE JEDNO -
   * inaczej uparcie nieważny token zamieniłby się w pętlę żądań.
   */
  it('nieważny token CSRF powoduje pobranie nowego i jedno powtórzenie', async () => {
    fetchMock
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(403, problem('CSRF_TOKEN_INVALID')))
      .mockResolvedValueOnce(odpowiedz(200, { ...CSRF, token: 'token-nowy' }))
      .mockResolvedValueOnce(odpowiedz(200, { ok: true }));

    await client.request('/translations/1', { method: 'DELETE' });

    expect(sciezki(fetchMock)).toEqual(['/auth/csrf', '/translations/1', '/auth/csrf', '/translations/1']);
    expect(fetchMock.mock.calls[3][1].headers[CSRF.headerName]).toBe('token-nowy');
  });

  it('powtórzenie po nieważnym tokenie nie zapętla się', async () => {
    fetchMock
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(403, problem('CSRF_TOKEN_INVALID')))
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(403, problem('CSRF_TOKEN_INVALID')));

    await expect(client.request('/translations/1', { method: 'DELETE' })).rejects.toMatchObject({
      code: 'CSRF_TOKEN_INVALID',
    });

    expect(fetchMock).toHaveBeenCalledTimes(4);
  });
});

describe('ciche odnowienie sesji', () => {
  /*
   * TO JEST NAJWAŻNIEJSZY TEST W TYM PLIKU i regresja na defekt, przez który siedmiodniowy
   * token odświeżający nie był używany ANI RAZU.
   *
   * Warunek obejmował tylko kod "token wygasł", a ten w przeglądarce nie występuje praktycznie
   * nigdy: ciasteczko z tokenem dostępowym ma czas życia równy ważności tokenu, więc znika
   * dokładnie wtedy, gdy token przestaje być ważny. Żądanie leci wówczas BEZ ciasteczka
   * i dostaje kod "brak uwierzytelnienia" - ten sam, co gość, który nigdy się nie logował.
   * Skutkiem była sesja umierająca co kwadrans, wyglądająca na krótką ważność tokenu.
   */
  it.each(['EXPIRED_TOKEN', 'UNAUTHENTICATED'])(
    'kod %s uruchamia odnowienie sesji i powtórzenie żądania',
    async (kod) => {
      fetchMock
        .mockResolvedValueOnce(odpowiedz(401, problem(kod)))
        .mockResolvedValueOnce(odpowiedz(200, CSRF))
        .mockResolvedValueOnce(odpowiedz(200, { ok: true }))
        .mockResolvedValueOnce(odpowiedz(200, { id: 7 }));

      await expect(client.request('/auth/me')).resolves.toEqual({ id: 7 });

      expect(sciezki(fetchMock)).toEqual(['/auth/me', '/auth/csrf', '/auth/refresh', '/auth/me']);
    },
  );

  it('inne kody 401 nie uruchamiają odnowienia', async () => {
    fetchMock.mockResolvedValueOnce(odpowiedz(401, problem('BAD_CREDENTIALS')));

    await expect(client.request('/auth/me')).rejects.toMatchObject({ code: 'BAD_CREDENTIALS' });

    expect(sciezki(fetchMock)).toEqual(['/auth/me']);
  });

  it('nieudane odnowienie zgłasza wygaśnięcie sesji i powiadamia o jej utracie', async () => {
    const utracona = vi.fn();
    client.setSessionLostHandler(utracona);

    fetchMock
      .mockResolvedValueOnce(odpowiedz(401, problem('UNAUTHENTICATED')))
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(401, problem('REFRESH_TOKEN_MISSING')));

    await expect(client.request('/auth/me')).rejects.toMatchObject({ code: 'SESSION_EXPIRED' });

    expect(utracona).toHaveBeenCalledTimes(1);
  });

  /*
   * Blokada konta nie mija sama, więc nie ma tu czego ponawiać. Bez tej gałęzi użytkownik
   * zostaje na ekranie, który przy każdej akcji sypie błędami, i nie ma jak się domyślić,
   * że ma wrócić na logowanie.
   */
  it('zablokowane konto powiadamia o utracie sesji, ale nie ponawia żądania', async () => {
    const utracona = vi.fn();
    client.setSessionLostHandler(utracona);

    fetchMock.mockResolvedValueOnce(odpowiedz(401, problem('ACCOUNT_BLOCKED')));

    await expect(client.request('/auth/me')).rejects.toMatchObject({ code: 'ACCOUNT_BLOCKED' });

    expect(utracona).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('kształt błędów', () => {
  /*
   * Frontend rozgałęzia się po kodzie maszynowym, a nie po tekście - tekst jest dla człowieka
   * i może się zmienić w każdej chwili. Identyfikator żądania jedzie aż na ekran, bo bez niego
   * zgłoszenie "wyskoczył mi błąd" jest nie do odnalezienia w logach serwera.
   */
  it('odpowiedź w formacie problemu daje kod, komunikat i identyfikator żądania', async () => {
    fetchMock
      // Metoda zmieniająca stan najpierw pobiera token CSRF - bez tej atrapy pierwsza
      // odpowiedź poszłaby na tamto wywołanie i test sprawdzałby coś innego, niż deklaruje.
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(
        odpowiedz(400, problem('VALIDATION_FAILED', { detail: 'Żądanie zawiera nieprawidłowe dane' })),
      );

    await expect(client.request('/auth/register', { method: 'POST', body: {} }))
      .rejects.toMatchObject({
        code: 'VALIDATION_FAILED',
        message: 'Żądanie zawiera nieprawidłowe dane',
        traceId: 'trace-1',
        status: 400,
      });
  });

  /*
   * Brak serwera, zerwane łącze i odbicie od reguł pochodzenia dają w przeglądarce ten SAM
   * wyjątek i nie da się ich rozróżnić. Komunikat wskazuje więc na nas: przy naszej awarii to
   * prawda, a przy cudzej użytkownik i tak nie ma czego naprawić - a rada "sprawdź połączenie"
   * przy działającym internecie wysyła w bezowocną pogoń.
   */
  it('brak łączności daje komunikat dla użytkownika, nie surowy błąd przeglądarki', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const blad = await client.request('/auth/me').catch((e) => e);

    expect(blad.code).toBe('NETWORK_ERROR');
    expect(blad.message).not.toContain('fetch');
    expect(blad.message).toMatch(/po naszej stronie/);
  });

  /*
   * Pobranie tokenu CSRF było jedynym wywołaniem w tym module bez osłony i właśnie tędy surowy
   * komunikat przeglądarki wyciekał na ekran. Ścieżka jest wcześniejsza niż osłonięte żądanie
   * właściwe, więc przy martwym serwerze wyjątek leciał stąd i nigdy nie docierał do tamtej
   * obsługi. Objaw mylił podwójnie: komunikat po angielsku w aplikacji pisanej po polsku
   * i wyłącznie po kliknięciu przycisku, podczas gdy samo wejście na stronę działało poprawnie.
   */
  it('brak łączności przy pobieraniu tokenu CSRF też daje komunikat dla użytkownika', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    const blad = await client.request('/auth/login', { method: 'POST', body: {} }).catch((e) => e);

    expect(blad.code).toBe('NETWORK_ERROR');
    expect(blad.message).not.toContain('fetch');
  });

  /*
   * Odpowiedź 502 od pośrednika nie niesie formatu problemu, bo aplikacja w ogóle jej nie
   * wygenerowała. Bez osobnej gałęzi wpadała na "wystąpił nieoczekiwany błąd" - zdanie prawdziwe,
   * ale nieodróżnialne od błędu walidacji i nieniosące jedynej użytecznej rady: spróbuj później.
   */
  it('awaria bez treści dostaje komunikat o problemie po naszej stronie', async () => {
    fetchMock.mockResolvedValueOnce(odpowiedz(502, undefined));

    const blad = await client.request('/auth/me').catch((e) => e);

    expect(blad.code).toBe('SERVER_ERROR');
    expect(blad.message).toMatch(/po naszej stronie/);
  });

  /** Gdy awaria NIESIE opis z serwera, wygrywa on - jest konkretniejszy niż tekst na zapas. */
  it('awaria z opisem z serwera zachowuje ten opis', async () => {
    fetchMock.mockResolvedValueOnce(
      odpowiedz(500, problem('INTERNAL_ERROR', { detail: 'Wewnętrzny błąd serwera' })),
    );

    const blad = await client.request('/auth/me').catch((e) => e);

    expect(blad.message).toBe('Wewnętrzny błąd serwera');
    expect(blad.code).toBe('INTERNAL_ERROR');
  });

  it('odpowiedź bez treści nie wywraca odczytu ciała', async () => {
    fetchMock
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(204, undefined));

    await expect(client.request('/translations/1', { method: 'DELETE' })).resolves.toBeNull();
  });
});

describe('wysyłanie pliku', () => {
  /*
   * Dane formularza NIE dostają nagłówka typu treści: przeglądarka musi ustawić go sama, razem
   * z granicą części. Ustawienie go ręcznie psuje parsowanie po stronie serwera - żądanie
   * dochodzi, ale pola są puste, co wygląda na błąd walidacji pliku.
   */
  it('multipart leci bez ręcznie ustawionego typu treści', async () => {
    fetchMock
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(202, { id: 1 }));

    const dane = new FormData();
    dane.append('targetLang', 'EN_GB');

    await client.upload('/translations', dane);

    const naglowki = fetchMock.mock.calls[1][1].headers;
    expect(naglowki['Content-Type']).toBeUndefined();
    expect(naglowki[CSRF.headerName]).toBe(CSRF.token);
  });

  it('zwykłe ciało jest serializowane i opisane typem JSON', async () => {
    fetchMock
      .mockResolvedValueOnce(odpowiedz(200, CSRF))
      .mockResolvedValueOnce(odpowiedz(200, {}));

    await client.request('/auth/login', { method: 'POST', body: { email: 'a@b.pl' } });

    const wywolanie = fetchMock.mock.calls[1][1];
    expect(wywolanie.headers['Content-Type']).toBe('application/json');
    expect(wywolanie.body).toBe('{"email":"a@b.pl"}');
  });
});
