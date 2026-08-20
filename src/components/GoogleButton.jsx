import { googleLoginUrl } from '../auth/google';

/**
 * Przycisk "przez Google".
 *
 * ZWYKŁY <a>, A NIE <button onClick={fetch(...)}>. Przepływ OAuth2 zaczyna się
 * przekierowaniem na accounts.google.com, więc przeglądarka musi tam NAWIGOWAĆ —
 * uzasadnienie i objawy pomyłki opisuje auth/google.js. Odnośnik daje przy okazji
 * to, czego przycisk by nie dał: podgląd adresu na pasku stanu, otwarcie w nowej
 * karcie środkowym przyciskiem i działanie przy wyłączonym JavaScripcie.
 *
 * Rejestracja i logowanie to dla Google JEDNA I TA SAMA operacja — konto po naszej
 * stronie powstaje przy pierwszym udanym logowaniu (a jeśli adres ma już konto założone
 * hasłem, oba zostają połączone). Dlatego różni się wyłącznie NAPIS, a nie adres ani
 * zachowanie; obiecywanie "rejestracji" osobnym przyciskiem sugerowałoby dwa różne
 * przepływy tam, gdzie jest jeden.
 */
export default function GoogleButton({ label = 'Zaloguj się przez Google' }) {
  return (
    <a className="button button-google" href={googleLoginUrl()}>
      <GoogleMark />
      <span>{label}</span>
    </a>
  );
}

/**
 * Znak firmowy Google, wstawiony jako SVG w kodzie zamiast pliku z sieci.
 *
 * Wersja z CDN-u wymagałaby połączenia z obcym hostem przy każdym wejściu na ekran
 * logowania i pokazywała pustą ramkę, gdyby ten host nie odpowiedział. Cztery kolory
 * są częścią znaku i nie wolno ich zamieniać na jednolity — tak samo jak nie wolno
 * go przerysowywać ani zmieniać proporcji.
 *
 * aria-hidden, bo znaczenie niesie napis obok; czytnik ekranu przeczytałby inaczej
 * to samo dwa razy.
 */
function GoogleMark() {
  return (
    <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.28-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  );
}
