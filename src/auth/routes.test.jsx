/**
 * Strażnicy tras.
 *
 * Nie są zabezpieczeniem - front da się obejść zawsze, a chroni reguła autoryzacji po stronie
 * serwera. Chodzi o to, żeby nie pokazywać ekranu komuś, kto zobaczy na nim same odmowy.
 *
 * SEDNO TEGO PLIKU TO GAŁĄŹ "jeszcze nie wiem". Dopóki serwer nie odpowie, kim jest bieżący
 * użytkownik, nie wolno przekierować - inaczej odświeżenie strony wyrzuca zalogowanego, mimo
 * ważnej sesji. Objaw pojawia się WYŁĄCZNIE po odświeżeniu, więc przy zwykłym klikaniu po
 * aplikacji nie widać go wcale.
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

vi.mock('./context', () => ({ useAuth: vi.fn() }));

import { RequireAuth, RequireAdmin, RequireAnonymous } from './routes';
import { useAuth } from './context';

/** Podstawia stan sesji, który normalnie pochodzi z zapytania o bieżącego użytkownika. */
function sesja(status, user = null) {
  useAuth.mockReturnValue({ status, user, login: vi.fn(), logout: vi.fn() });
}

/** Renderuje strażnika na trasie chronionej i dwie trasy, na które może przekierować. */
function pokaz(Straznik, sciezka = '/chronione') {
  return render(
    <MemoryRouter initialEntries={[sciezka]}>
      <Routes>
        <Route
          path="/chronione"
          element={
            <Straznik>
              <div>zawartość chroniona</div>
            </Straznik>
          }
        />
        <Route path="/" element={<div>ekran logowania</div>} />
        <Route path="/dashboard" element={<div>pulpit</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('trasa dla zalogowanych', () => {
  it('czeka na odpowiedź serwera, zamiast przekierowywać', () => {
    sesja('loading');
    pokaz(RequireAuth);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.queryByText('ekran logowania')).toBeNull();
  });

  it('wpuszcza zalogowanego', () => {
    sesja('authenticated', { id: 1, role: 'USER' });
    pokaz(RequireAuth);

    expect(screen.getByText('zawartość chroniona')).toBeDefined();
  });

  it('odsyła anonimowego na ekran logowania', () => {
    sesja('anonymous');
    pokaz(RequireAuth);

    expect(screen.getByText('ekran logowania')).toBeDefined();
  });
});

describe('trasa dla administratora', () => {
  /*
   * TO JEST NAJWAŻNIEJSZY TEST W TYM PLIKU. Dopóki serwer nie odpowie, użytkownik jest pusty,
   * więc sprawdzenie roli wypada fałszywie i administrator po odświeżeniu panelu lądował na
   * pulpicie. Ten sam błąd co przy trasie dla zalogowanych, ale objawiający się dopiero po
   * odświeżeniu - czyli trudniejszy do zauważenia i łatwiejszy do wprowadzenia z powrotem.
   */
  it('czeka na odpowiedź serwera, zamiast odsyłać na pulpit', () => {
    sesja('loading');
    pokaz(RequireAdmin);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.queryByText('pulpit')).toBeNull();
  });

  it('wpuszcza administratora', () => {
    sesja('authenticated', { id: 1, role: 'ADMIN' });
    pokaz(RequireAdmin);

    expect(screen.getByText('zawartość chroniona')).toBeDefined();
  });

  /*
   * Zalogowany bez roli jest zalogowany POPRAWNIE - brakuje mu tylko uprawnień. Ekran logowania
   * sugerowałby, że sesja padła, i wysłał go w podróż po własnym haśle, więc przekierowanie
   * prowadzi na pulpit.
   */
  it('zalogowanego bez roli odsyła na pulpit, a nie na logowanie', () => {
    sesja('authenticated', { id: 2, role: 'USER' });
    pokaz(RequireAdmin);

    expect(screen.getByText('pulpit')).toBeDefined();
    expect(screen.queryByText('ekran logowania')).toBeNull();
  });

  it('anonimowego odsyła na ekran logowania', () => {
    sesja('anonymous');
    pokaz(RequireAdmin);

    expect(screen.getByText('ekran logowania')).toBeDefined();
  });
});

describe('trasa dla niezalogowanych', () => {
  it('czeka na odpowiedź serwera, zamiast pokazywać formularz zalogowanemu', () => {
    sesja('loading');
    pokaz(RequireAnonymous);

    expect(screen.getByRole('status')).toBeDefined();
    expect(screen.queryByText('zawartość chroniona')).toBeNull();
  });

  it('odsyła zalogowanego na pulpit', () => {
    sesja('authenticated', { id: 1, role: 'USER' });
    pokaz(RequireAnonymous);

    expect(screen.getByText('pulpit')).toBeDefined();
  });

  it('wpuszcza anonimowego', () => {
    sesja('anonymous');
    pokaz(RequireAnonymous);

    expect(screen.getByText('zawartość chroniona')).toBeDefined();
  });
});
