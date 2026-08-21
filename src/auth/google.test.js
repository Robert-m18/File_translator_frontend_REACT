/**
 * Logowanie kontem Google: adres do nawigacji i tłumaczenie kodów odmowy.
 *
 * Kody przychodzą w ADRESIE, a nie w ciele odpowiedzi, bo przeglądarka jest wtedy w trakcie
 * nawigacji z powrotem od dostawcy - surowa odpowiedź wylądowałaby użytkownikowi na ekranie.
 * Front rozgałęzia się po kodzie, nie po tekście, tak samo jak przy zwykłych błędach API.
 */
import { describe, it, expect } from 'vitest';
import { googleLoginUrl, googleErrorMessage } from './google';

describe('adres rozpoczynający logowanie', () => {
  /*
   * Identyfikator rejestracji jest CZĘŚCIĄ adresu i po stronie serwera wchodzi także do adresu
   * powrotnego wpisanego w konsoli dostawcy. Zmiana tego fragmentu wymaga zmiany w trzech
   * miejscach naraz, a objawem pomyłki jest odmowa dostawcy w połowie logowania.
   */
  it('prowadzi do końcówki rozpoczynającej przepływ dla rejestracji "google"', () => {
    expect(googleLoginUrl()).toMatch(/\/oauth2\/authorization\/google$/);
  });

  /*
   * Adres składany jest z tej samej podstawy co reszta wywołań. Dwa źródła prawdy o tym, gdzie
   * stoi API, rozjechałyby się przy pierwszym wdrożeniu pod innym adresem - i to wyłącznie
   * na ścieżce logowania przez Google, czyli tam, gdzie najtrudniej to zauważyć.
   */
  it('używa tej samej podstawy adresu co pozostałe wywołania', async () => {
    const { API_BASE } = await import('../api/client');
    expect(googleLoginUrl().startsWith(API_BASE)).toBe(true);
  });
});

describe('komunikaty odmowy', () => {
  /*
   * Serwer odmawia, dopóki dostawca nie potwierdzi adresu, bo to właśnie potwierdzony adres
   * łączy konto zewnętrzne z kontem założonym hasłem. Bez tej odmowy wystarczyłoby założyć
   * konto u dostawcy na cudzy adres, żeby przejąć cudze konto - dlatego komunikat ma mówić,
   * co zrobić, a nie tylko że się nie udało.
   */
  it('niepotwierdzony adres tłumaczy się na wskazówkę, co zrobić', () => {
    const komunikat = googleErrorMessage('GOOGLE_EMAIL_NOT_VERIFIED');
    expect(komunikat).toMatch(/potwierdzonego adresu/);
    expect(komunikat).toMatch(/hasłem/);
  });

  /*
   * Ten sam kod dostaje logowanie hasłem i filtr uwierzytelniający po stronie serwera - dla
   * frontu to jeden stan i jedna reakcja, niezależnie od tego, którą drogą użytkownik wchodził.
   * Blokada nie mija sama, więc komunikat nie może zachęcać do ponawiania.
   */
  it('blokada konta kieruje do obsługi, a nie do ponowienia', () => {
    const komunikat = googleErrorMessage('ACCOUNT_BLOCKED');
    expect(komunikat).toMatch(/zablokowane/);
    expect(komunikat).toMatch(/obsługą/);
    expect(komunikat).not.toMatch(/[Ss]próbuj ponownie/);
  });

  it('zbiorcza odmowa zachęca do ponowienia', () => {
    expect(googleErrorMessage('GOOGLE_AUTH_FAILED')).toMatch(/[Ss]próbuj ponownie/);
  });

  /*
   * Parametr w adresie ustawia kto chce, więc nieznany kod musi dostać komunikat zbiorczy.
   * Milczenie zostawiłoby użytkownika po powrocie od dostawcy na czystym ekranie logowania,
   * bez żadnej informacji o tym, że cokolwiek się nie udało.
   */
  it('nieznany kod dostaje komunikat zbiorczy zamiast milczenia', () => {
    expect(googleErrorMessage('COS_CZEGO_NIE_ZNAMY')).toBe(googleErrorMessage('GOOGLE_AUTH_FAILED'));
  });

  /** Brak parametru to normalne wejście na ekran logowania - nie ma czego pokazywać. */
  it('brak kodu nie daje żadnego komunikatu', () => {
    expect(googleErrorMessage(null)).toBeNull();
    expect(googleErrorMessage(undefined)).toBeNull();
    expect(googleErrorMessage('')).toBeNull();
  });
});
