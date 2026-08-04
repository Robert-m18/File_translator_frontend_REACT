import { createContext, useContext } from 'react';

/**
 * Kontekst i hook wydzielone z AuthContext.jsx, bo plik eksportujący komponent obok
 * zwykłych funkcji psuje szybkie odświeżanie (fast refresh) w trybie deweloperskim.
 */
export const AuthCtx = createContext(null);

export function useAuth() {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth musi być użyte wewnątrz <AuthProvider>');
  return ctx;
}
