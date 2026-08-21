/**
 * Wyścig odpowiedzi na ekranie tłumaczeń.
 *
 * To jest test, którego brakowało, gdy poprawka wchodziła na master: defekt przeszedł wtedy
 * przez lint, budowanie i wdrożenie bez jednego śladu, bo żadne z tych narzędzi nie patrzy na
 * KOLEJNOŚĆ, w jakiej wracają odpowiedzi.
 *
 * Ekran odpytuje o stan w stałym rytmie, więc wystarczy jedna wolniejsza odpowiedź, żeby
 * zachodziła na następną. Gdy wcześniejszy odczyt wróci później, wpisuje na ekran nieaktualną
 * listę - najbardziej widać to po skasowaniu zlecenia, bo odczyt sprzed kasowania przywraca
 * wiersz, którego już nie ma.
 *
 * MIARĄ JEST TREŚĆ LISTY PO USTANIU RUCHU, a nie liczba wywołań: wywołań jest tyle samo
 * z poprawką i bez niej, więc licząc je, nie dałoby się odróżnić działającego zabezpieczenia
 * od jego braku.
 *
 * Czas jest sterowany, a nie odczekiwany. Test na prawdziwym zegarze musiałby czekać sekundy
 * i byłby niestabilny na wolniejszej maszynie - a badana własność nie zależy od tego, ile
 * naprawdę trwa odpowiedź, tylko od tego, która wróci pierwsza.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

vi.mock('../api/translations', async (importOryginalu) => ({
  // Stałe (języki, formaty, statusy oczekujące) zostają PRAWDZIWE - są kontraktem z serwerem
  // i podmienione atrapą sprawiłyby, że test przechodzi także wtedy, gdy rozjadą się z API.
  ...(await importOryginalu()),
  listTranslations: vi.fn(),
  deleteTranslation: vi.fn(),
  submitTranslation: vi.fn(),
  downloadTranslation: vi.fn(),
}));

import Translations from './Translations';
import { listTranslations, deleteTranslation } from '../api/translations';

/** Obietnica, którą test rozwiązuje wtedy, kiedy chce - stąd pełna kontrola nad kolejnością. */
function odroczona() {
  let rozwiaz;
  const obietnica = new Promise((r) => {
    rozwiaz = r;
  });
  return { obietnica, rozwiaz };
}

function zlecenie(id, nazwa, status) {
  return {
    id,
    originalFilename: nazwa,
    sourceLang: null,
    targetLang: 'EN_GB',
    status,
    charCount: 10,
    createdAt: '2026-08-21T10:00:00Z',
    completedAt: null,
  };
}

const strona = (zlecenia) => ({ content: zlecenia });

function pokaz() {
  return render(
    <MemoryRouter>
      <Translations />
    </MemoryRouter>,
  );
}

/** Przesuwa sterowany zegar i przepuszcza obietnice, które przez to dojrzały. */
async function uplynie(ms) {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms);
  });
}

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('wyścig odczytów listy', () => {
  it('spóźniona odpowiedź nie nadpisuje świeższej', async () => {
    const drugi = odroczona();
    const trzeci = odroczona();

    listTranslations
      // Pierwszy odczyt kończy się od razu i zostawia zlecenie W TOKU - dopiero to uruchamia
      // cykliczne odpytywanie, bez którego nie ma jak doprowadzić do dwóch odpowiedzi naraz.
      .mockResolvedValueOnce(strona([zlecenie(1, 'umowa.txt', 'PENDING')]))
      .mockReturnValueOnce(drugi.obietnica)
      .mockReturnValueOnce(trzeci.obietnica);

    pokaz();
    await uplynie(0);
    expect(screen.getByText('umowa.txt')).toBeDefined();

    // Dwa kolejne cykle odpytywania startują, żaden jeszcze nie wrócił.
    await uplynie(2000);
    await uplynie(2000);
    expect(listTranslations).toHaveBeenCalledTimes(3);

    // Nowszy wraca PIERWSZY i to jego wynik ma zostać na ekranie.
    await act(async () => {
      trzeci.rozwiaz(strona([zlecenie(1, 'umowa.txt', 'DONE')]));
      await trzeci.obietnica;
    });

    // Starszy wraca PO nim, z nieaktualnym stanem.
    await act(async () => {
      drugi.rozwiaz(strona([zlecenie(1, 'umowa.txt', 'PENDING')]));
      await drugi.obietnica;
    });

    expect(screen.getByText('gotowe')).toBeDefined();
    expect(screen.queryByText('w kolejce')).toBeNull();
  });

  /*
   * Najbardziej widoczny objaw tego wyścigu: odczyt rozpoczęty PRZED skasowaniem wraca po nim
   * i przywraca skasowany wiersz. Znika przy następnym cyklu, więc wygląda na mignięcie
   * interfejsu, a nie na wyścig - i właśnie dlatego wymaga testu, a nie oglądania ekranu.
   */
  it('odczyt sprzed skasowania nie przywraca skasowanego zlecenia', async () => {
    const wLocie = odroczona();
    const poSkasowaniu = odroczona();

    listTranslations
      .mockResolvedValueOnce(strona([zlecenie(1, 'umowa.txt', 'PENDING')]))
      .mockReturnValueOnce(wLocie.obietnica)
      .mockReturnValueOnce(poSkasowaniu.obietnica);

    deleteTranslation.mockResolvedValue(null);

    pokaz();
    await uplynie(0);
    expect(screen.getByText('umowa.txt')).toBeDefined();

    // Cykl odpytywania rusza i zostaje w locie.
    await uplynie(2000);

    // W tym czasie użytkownik kasuje zlecenie; kasowanie kończy się własnym odczytem listy.
    await act(async () => {
      screen.getByRole('button', { name: /usuń/i }).click();
    });

    await act(async () => {
      poSkasowaniu.rozwiaz(strona([]));
      await poSkasowaniu.obietnica;
    });

    // Dopiero teraz wraca odczyt sprzed kasowania, wciąż ze skasowanym zleceniem.
    await act(async () => {
      wLocie.rozwiaz(strona([zlecenie(1, 'umowa.txt', 'PENDING')]));
      await wLocie.obietnica;
    });

    expect(screen.queryByText('umowa.txt')).toBeNull();
    expect(deleteTranslation).toHaveBeenCalledWith(1);
  });

  /*
   * Odpytywanie ma ustawać samo, gdy nie ma już czego pilnować - inaczej karta otwarta w tle
   * odpytywałaby API co kilka sekund przez cały dzień. Objawu nie widać na ekranie, więc bez
   * testu nikt by tego nie zauważył aż do rachunku za ruch albo wpisów w logu serwera.
   */
  it('odpytywanie ustaje, gdy żadne zlecenie nie jest już w toku', async () => {
    listTranslations.mockResolvedValue(strona([zlecenie(1, 'umowa.txt', 'DONE')]));

    pokaz();
    await uplynie(0);
    expect(listTranslations).toHaveBeenCalledTimes(1);

    await uplynie(10_000);

    expect(listTranslations).toHaveBeenCalledTimes(1);
  });

  it('odpytywanie trwa, dopóki cokolwiek jest w toku', async () => {
    listTranslations.mockResolvedValue(strona([zlecenie(1, 'umowa.txt', 'PROCESSING')]));

    pokaz();
    await uplynie(0);

    await uplynie(2000);
    await uplynie(2000);

    expect(listTranslations).toHaveBeenCalledTimes(3);
  });
});
