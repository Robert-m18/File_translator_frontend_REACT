/**
 * Stan sesji dla całej aplikacji.
 *
 * Źródłem prawdy jest WYŁĄCZNIE serwer, odpytywany przez GET /auth/me. Kuszące jest
 * trzymanie flagi "zalogowany" w localStorage, ale taka flaga kłamie w obie strony:
 * zostaje po wygaśnięciu sesji (użytkownik widzi dashboard, a każde żądanie wraca 401)
 * i znika po wyczyszczeniu przeglądarki mimo ważnej sesji na serwerze. Ciasteczka są
 * httpOnly, więc JavaScript i tak ich nie odczyta - jedyne wiarygodne pytanie
 * to pytanie do serwera.
 */
import { useCallback, useEffect, useState } from 'react';
import { meRequest, loginRequest, logoutRequest } from '../api/auth';
import { setSessionLostHandler } from '../api/client';
import { AuthCtx } from './context';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // "loading" do czasu pierwszej odpowiedzi z /auth/me. Bez tego stanu aplikacja przez
  // moment renderuje ekran logowania zalogowanemu użytkownikowi - migotanie przy każdym F5.
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    // Gdy klient wyczerpie próby odświeżenia tokenu, czyścimy stan bez pytania serwera.
    setSessionLostHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });

    let cancelled = false;

    meRequest({ allowRefresh: false })
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setStatus('authenticated');
      })
      .catch(() => {
        // 401 przy starcie to normalna odpowiedź dla gościa, nie awaria
        if (cancelled) return;
        setUser(null);
        setStatus('anonymous');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (credentials) => {
    await loginRequest(credentials);
    // Danych użytkownika nie ma w odpowiedzi logowania - pobieramy je stamtąd, skąd
    // pobiera je reszta aplikacji, żeby istniała jedna ścieżka i jeden kształt danych.
    const data = await meRequest();
    setUser(data);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // Stan czyścimy nawet gdy wywołanie padło. Sesja mogła już nie istnieć, a
      // zostawienie użytkownika na dashboardzie po kliknięciu "Wyloguj" byłoby gorsze
      // niż rozjechanie się z serwerem, które i tak wyjdzie przy pierwszym żądaniu.
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  return <AuthCtx.Provider value={{ user, status, login, logout }}>{children}</AuthCtx.Provider>;
}
