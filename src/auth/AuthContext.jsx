/**
 * Stan sesji dla całej aplikacji.
 *
 * Źródłem prawdy jest wyłącznie serwer, odpytywany osobnym endpointem. Flaga zalogowania
 * trzymana w pamięci przeglądarki kłamałaby w obie strony: zostawałaby po wygaśnięciu
 * sesji, przez co użytkownik widziałby pulpit, na którym każde żądanie kończy się odmową,
 * i znikałaby po wyczyszczeniu danych przeglądarki mimo ważnej sesji na serwerze. Ciasteczka
 * są niedostępne dla skryptów, więc jedyne wiarygodne pytanie o stan sesji to pytanie
 * do serwera.
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
    // Gdy warstwa API wyczerpie próby odnowienia sesji, stan czyszczony jest bez pytania serwera.
    setSessionLostHandler(() => {
      setUser(null);
      setStatus('anonymous');
    });

    let cancelled = false;

    // Odnawianie sesji pozostaje włączone. Ciasteczko z tokenem znika razem z jego ważnością,
    // więc brak ciasteczka oznacza przy starcie dwie różne sytuacje: gościa oraz wracającego
    // użytkownika z ważnym tokenem odnawiającym. Warstwa API próbuje więc odnowić sesję,
    // zanim uzna kogoś za anonimowego - inaczej każdy powrót po kwadransie kończyłby się
    // ekranem logowania.
    meRequest()
      .then((data) => {
        if (cancelled) return;
        setUser(data);
        setStatus('authenticated');
      })
      .catch(() => {
        // Ta gałąź wykonuje się dopiero wtedy, gdy nie powiodło się również odnowienie sesji,
        // czyli dla gościa albo dla sesji unieważnionej po stronie serwera. To normalny stan.
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
    // Odpowiedź logowania nie zawiera danych użytkownika, więc pobierane są stamtąd, skąd
    // pobiera je reszta aplikacji - jedna ścieżka i jeden kształt danych.
    const data = await meRequest();
    setUser(data);
    setStatus('authenticated');
    return data;
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutRequest();
    } finally {
      // Stan czyszczony jest nawet wtedy, gdy wywołanie zawiodło: sesja mogła już nie istnieć,
      // a pozostawienie użytkownika na pulpicie po kliknięciu wylogowania byłoby gorsze
      // niż rozbieżność ze stanem serwera, która i tak wyjdzie przy pierwszym żądaniu.
      setUser(null);
      setStatus('anonymous');
    }
  }, []);

  return <AuthCtx.Provider value={{ user, status, login, logout }}>{children}</AuthCtx.Provider>;
}
