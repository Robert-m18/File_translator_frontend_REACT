/**
 * Wspólne przygotowanie każdego pliku testowego.
 *
 * Sprzątanie po wyrenderowanych komponentach jest tu obowiązkowe, a nie kosmetyczne: bez niego
 * kolejny test w tym samym pliku znajduje w dokumencie także poprzedni ekran, więc wyszukiwanie
 * po tekście trafia w dwa elementy naraz i pada na niejednoznaczności - w teście, który z tamtym
 * ekranem nie ma nic wspólnego. Objaw wskazuje wtedy zły test.
 *
 * Automatyczne sprzątanie biblioteki testującej włącza się tylko przy globalnym afterEach,
 * a ten projekt świadomie nie włącza zmiennych globalnych - stąd jawne wywołanie.
 */
import { afterEach, vi } from 'vitest';
import { cleanup } from '@testing-library/react';

afterEach(() => {
  cleanup();
  // Atrapy są zakładane per test i nie mogą przeciekać do następnego - inaczej wynik zależy
  // od kolejności wykonania, czyli od czegoś, czego test nie deklaruje.
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
