/**
 * Reguły walidacji są LUSTREM polityki serwera i to jest cały powód istnienia tych testów.
 *
 * Serwer i tak sprawdza wszystko od nowa, więc walidacja we froncie niczego nie zabezpiecza -
 * ma natomiast nie kłamać co do wymagań. Rozjazd nie daje żadnego objawu technicznego:
 * formularz działa, tylko odrzuca hasło, które serwer by przyjął, albo przepuszcza takie,
 * które serwer odrzuci dopiero po wysłaniu.
 *
 * Progi poniżej odpowiadają adnotacji polityki hasła po stronie serwera (8-72 znaki, litera
 * i cyfra) oraz długości kolumny imienia (2-50). Gdy tam się zmienią, te testy mają zaczerwienić.
 */
import { describe, it, expect } from 'vitest';
import { validateEmail, passwordError, validatePassword, nameError } from './validation';

describe('adres e-mail', () => {
  it('przyjmuje zwykły adres', () => {
    expect(validateEmail('robert@example.com')).toBe(true);
  });

  it('przyjmuje adres pisany wielkimi literami - o wielkość liter dba normalizacja na serwerze', () => {
    expect(validateEmail('Robert@Example.COM')).toBe(true);
  });

  it.each([
    ['bez małpy', 'robert.example.com'],
    ['bez domeny', 'robert@'],
    ['bez kropki w domenie', 'robert@example'],
    ['ze spacją w środku', 'rob ert@example.com'],
    ['pusty', ''],
  ])('odrzuca adres %s', (_opis, adres) => {
    expect(validateEmail(adres)).toBe(false);
  });
});

describe('polityka hasła', () => {
  it('przyjmuje hasło spełniające wszystkie wymagania', () => {
    expect(passwordError('DemoFileTranslator1')).toBeNull();
    expect(validatePassword('DemoFileTranslator1')).toBe(true);
  });

  it('przyjmuje dokładnie ośmioznakowe - próg jest włączny', () => {
    expect(passwordError('abcdefg1')).toBeNull();
  });

  it('odrzuca siedmioznakowe', () => {
    expect(passwordError('abcdef1')).toMatch(/8 znaków/);
  });

  /*
   * Górny próg nie jest widzimisię: funkcja hashująca po stronie serwera ucina wejście po
   * 72 bajtach, więc dłuższe hasło daje użytkownikowi fałszywe poczucie bezpieczeństwa -
   * znaki powyżej progu nie biorą udziału w niczym.
   */
  it('przyjmuje dokładnie 72 znaki i odrzuca 73', () => {
    const zGranicy = 'a1'.padEnd(72, 'x');
    expect(zGranicy).toHaveLength(72);
    expect(passwordError(zGranicy)).toBeNull();
    expect(passwordError(`${zGranicy}x`)).toMatch(/72/);
  });

  it('odrzuca hasło bez cyfry', () => {
    expect(passwordError('samiliterki')).toMatch(/literę i jedną cyfrę/);
  });

  it('odrzuca hasło bez litery', () => {
    expect(passwordError('12345678')).toMatch(/literę i jedną cyfrę/);
  });

  it('odrzuca puste i wartości, które nie są tekstem', () => {
    expect(passwordError('')).toMatch(/puste/);
    expect(passwordError(undefined)).toMatch(/puste/);
    expect(passwordError(null)).toMatch(/puste/);
  });
});

describe('imię', () => {
  it('przyjmuje długości z obu krańców zakresu', () => {
    expect(nameError('Ro')).toBeNull();
    expect(nameError('R'.repeat(50))).toBeNull();
  });

  it('odrzuca jednoznakowe i dłuższe niż pojemność kolumny', () => {
    expect(nameError('R')).toMatch(/2 znaki/);
    expect(nameError('R'.repeat(51))).toMatch(/50 znaków/);
  });

  /*
   * Same białe znaki mają być odrzucone jak puste pole. Wersja licząca długość bez przycięcia
   * przepuściłaby "   " jako imię trzyznakowe, a użytkownik zobaczyłby potem pusty nagłówek
   * pulpitu zamiast błędu przy formularzu.
   */
  it('odrzuca same białe znaki', () => {
    expect(nameError('   ')).toMatch(/2 znaki/);
  });
});
