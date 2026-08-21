import { Link } from 'react-router-dom';

/**
 * Polityka prywatności.
 *
 * Strona PUBLICZNA i taka musi zostać: czyta ją człowiek, który jeszcze nie ma konta
 * i właśnie zastanawia się, czy je założyć, a ten sam adres podaje się w konsoli Google
 * Cloud przy weryfikacji ekranu zgody - tam sięga po nią robot bez ciasteczek.
 *
 * TREŚĆ MA ODPOWIADAĆ TEMU, CO APLIKACJA NAPRAWDĘ ROBI, i to jest jedyny powód, dla którego
 * ten plik jest tak konkretny. Ogólniki ("dbamy o Twoje dane") nie kosztują nic i nic nie
 * znaczą; wymienienie z nazwy dostawców, terminów retencji i ciasteczek robi z tej strony
 * dokument, który da się sprawdzić.
 *
 * DLATEGO: zmieniając retencję, dokładając dostawcę albo nowe ciasteczko, popraw to TUTAJ
 * w tym samym commicie. Rozjazd nie daje żadnego objawu technicznego - strona dalej się
 * wyświetla - a jest wtedy po prostu nieprawdą napisaną przez nas o nas samych.
 *
 * Wartości pochodzą z: app.translation.retention (30 dni) i reguły wygasania na kubełku
 * (31 dni), jwt.expiration (15 min) i tokenu odświeżającego (7 dni), ważności tokenu
 * rejestracji (24 h) i resetu hasła (1 h), app.outbox.retention (1 doba).
 */

const CONTACT = 'rmoczygeba11@gmail.com';
const UPDATED = '21 sierpnia 2026';

export default function Privacy() {
  const mailto = `mailto:${CONTACT}`;

  return (
    <div className="card card-wide legal">
      <header className="card-head row">
        <div>
          <h1>Polityka prywatności</h1>
          <p className="muted">Aktualizacja: {UPDATED}</p>
        </div>
        <Link className="button button-ghost" to="/">
          Wróć
        </Link>
      </header>

      <p>
        File Translator to serwis do tłumaczenia plików. Ta strona opisuje, jakie dane
        zbieramy, po co, komu je przekazujemy i jak długo je trzymamy. Opisuje stan
        faktyczny aplikacji, a nie zamiary - jeśli coś się w niej zmieni, zmieni się
        i ten tekst.
      </p>

      <h2>1. Kto odpowiada za dane</h2>
      <p>
        Administratorem danych jest Robert Moczygęba, autor i operator serwisu, prowadzący
        go jako projekt prywatny. Kontakt we wszystkich sprawach dotyczących danych -
        w tym w sprawie usunięcia konta: <a href={mailto}>{CONTACT}</a>. Na zgłoszenia
        odpowiadamy bez zbędnej zwłoki, najpóźniej w ciągu miesiąca.
      </p>

      <h2>2. Jakie dane zbieramy i na jakiej podstawie</h2>
      <dl className="legal-list">
        <div>
          <dt>Konto</dt>
          <dd>
            Adres e-mail, imię oraz hasło zapisane wyłącznie jako skrót kryptograficzny
            (BCrypt) - hasła w postaci czytelnej nie mamy i nie da się go z tego skrótu
            odtworzyć. Przy logowaniu przez Google dochodzi identyfikator Twojego konta
            Google; nie pobieramy stamtąd nic poza nim, adresem e-mail i imieniem.
            Podstawa: wykonanie umowy o świadczenie usługi (art. 6 ust. 1 lit. b RODO).
          </dd>
        </div>
        <div>
          <dt>Pliki i zlecenia tłumaczenia</dt>
          <dd>
            Treść pliku, który wgrywasz, treść tłumaczenia, nazwa pliku, język docelowy,
            liczba znaków oraz daty. Treść plików trzymamy w magazynie plikowym, a nie
            w bazie danych. Podstawa: wykonanie umowy (art. 6 ust. 1 lit. b RODO).
          </dd>
        </div>
        <div>
          <dt>Dane techniczne i bezpieczeństwa</dt>
          <dd>
            Licznik nieudanych logowań, data i powód ewentualnej blokady konta, adres IP
            zapisywany w logu przy przekroczeniu limitu żądań oraz identyfikator żądania,
            po którym da się odnaleźć je w logach. Podstawa: nasz prawnie uzasadniony
            interes polegający na ochronie serwisu przed nadużyciami (art. 6 ust. 1
            lit. f RODO).
          </dd>
        </div>
        <div>
          <dt>Poczta</dt>
          <dd>
            Adres e-mail i treść wiadomości technicznych: potwierdzenie rejestracji, reset
            hasła, informacja o gotowym tłumaczeniu. Nie wysyłamy newslettera ani żadnej
            innej poczty marketingowej.
          </dd>
        </div>
      </dl>

      <h2>3. Komu przekazujemy dane</h2>
      <p>
        Danych nie sprzedajemy i nie udostępniamy nikomu do własnych celów. Korzystamy
        natomiast z usług, bez których serwis nie działa - każda z nich przetwarza dane
        na nasze zlecenie:
      </p>
      <ul>
        <li>
          <strong>DeepL SE</strong> (Niemcy) - otrzymuje treść tłumaczonych plików. To
          jedyny odbiorca, do którego trafia zawartość Twoich dokumentów.
        </li>
        <li>
          <strong>Brevo</strong> (Francja) - wysyłka poczty; otrzymuje adres odbiorcy
          i treść wiadomości.
        </li>
        <li>
          <strong>Neon</strong> (baza danych, serwery w USA) - dane konta i opisy zleceń.
        </li>
        <li>
          <strong>Backblaze B2</strong> (magazyn plików, serwery w Unii Europejskiej) -
          pliki źródłowe i przetłumaczone.
        </li>
        <li>
          <strong>Render</strong> (hosting aplikacji, serwery w USA) - logi serwera.
        </li>
        <li>
          <strong>Cloudflare</strong> - hosting tej strony.
        </li>
        <li>
          <strong>Google</strong> - wyłącznie wtedy, gdy wybierzesz logowanie przez Google.
        </li>
      </ul>
      <p>
        Część z tych usług działa na serwerach poza Europejskim Obszarem Gospodarczym.
        Przekazanie odbywa się na standardowych klauzulach umownych zatwierdzonych przez
        Komisję Europejską, stosowanych przez tych dostawców.
      </p>
      <p className="callout">
        <strong>Ważne przy tłumaczeniu plików.</strong> Serwis korzysta z darmowego planu
        DeepL API. Zgodnie z warunkami DeepL dla planu darmowego przesyłane teksty mogą
        być wykorzystywane do ulepszania jakości tłumaczeń - w planie płatnym są kasowane
        po przetłumaczeniu. Dopóki działamy na planie darmowym, nie wgrywaj tutaj
        dokumentów poufnych ani cudzych danych wrażliwych.
      </p>

      <h2>4. Jak długo trzymamy dane</h2>
      <ul>
        <li>
          <strong>Konto</strong> - do czasu jego usunięcia. Konta nieużywane nie znikają
          same.
        </li>
        <li>
          <strong>Zlecenia i pliki</strong> - 30 dni od wgrania, potem kasujemy je
          automatycznie. Każde zlecenie możesz usunąć wcześniej, sam, z listy tłumaczeń.
          Kopia w magazynie plikowym wygasa najpóźniej po 31 dniach.
        </li>
        <li>
          <strong>Sesje</strong> - token dostępu jest ważny 15 minut, token odnowienia
          7 dni. Wylogowanie unieważnia sesję od razu.
        </li>
        <li>
          <strong>Link potwierdzający rejestrację</strong> - 24 godziny.{' '}
          <strong>Link do resetu hasła</strong> - 1 godzina, jednorazowy.
        </li>
        <li>
          <strong>Wysłane wiadomości w kolejce poczty</strong> - kasowane dobę po wysyłce.
        </li>
        <li>
          <strong>Logi serwera</strong> - przechowywane przez dostawcę hostingu zgodnie
          z jego retencją. Nie zapisujemy w nich adresów e-mail.
        </li>
      </ul>

      <h2>5. Ciasteczka</h2>
      <p>
        Używamy wyłącznie ciasteczek niezbędnych do działania serwisu. Nie ma tu analityki,
        reklamy ani śledzenia, więc nie pytamy o zgodę - nie ma na co jej udzielać.
      </p>
      <ul>
        <li>
          <code>accessToken</code>, <code>refreshToken</code> - utrzymanie zalogowania.
        </li>
        <li>
          <code>XSRF-TOKEN</code> - ochrona przed fałszowaniem żądań z innych stron.
        </li>
        <li>
          <code>oauth2_auth_request</code> - istnieje tylko przez chwilę logowania przez
          Google, żeby powrót z ich strony trafił tam, skąd wyszedł.
        </li>
      </ul>
      <p>
        Wszystkie są niedostępne dla skryptów w przeglądarce (flaga HttpOnly) i wysyłane
        wyłącznie po HTTPS.
      </p>

      <h2>6. Twoje prawa</h2>
      <p>
        Masz prawo dostępu do swoich danych, ich sprostowania, usunięcia, ograniczenia
        przetwarzania, przenoszenia oraz wniesienia sprzeciwu wobec przetwarzania opartego
        na naszym prawnie uzasadnionym interesie. Napisz na <a href={mailto}>{CONTACT}</a>{' '}
        - to jedyny potrzebny krok.
      </p>
      <p>
        Przysługuje Ci też skarga do Prezesa Urzędu Ochrony Danych Osobowych
        (ul. Stawki 2, 00-193 Warszawa).
      </p>

      <h2>7. Usunięcie konta</h2>
      <p>
        Na żądanie wysłane z adresu, na który konto jest założone, kasujemy je razem
        z wszystkim, co za nim stoi: sesjami, zleceniami tłumaczenia i wgranymi plikami.
        Operacja jest nieodwracalna - konta nie da się przywrócić.
      </p>
      <p>
        Nie musisz przy tym czekać na nas w sprawie samych plików: pojedyncze zlecenie
        razem z plikiem źródłowym i tłumaczeniem usuwasz w każdej chwili sam, z listy
        tłumaczeń.
      </p>

      <h2>8. Bezpieczeństwo</h2>
      <p>
        Hasła przechowujemy wyłącznie jako skróty BCrypt. Ruch idzie po HTTPS, ciasteczka
        sesji są niedostępne dla skryptów, żądania zmieniające dane wymagają tokenu
        chroniącego przed atakiem z innej strony, a liczba prób logowania jest ograniczona.
        W logach zapisujemy identyfikatory, nie adresy e-mail. Żadne z tych zabezpieczeń
        nie daje stuprocentowej pewności i nie obiecujemy jej.
      </p>

      <h2>9. Pliki dotyczące innych osób</h2>
      <p>
        Jeśli wgrywasz dokument zawierający dane innych osób, to Ty decydujesz o tym
        przetwarzaniu i odpowiadasz za jego podstawę prawną. My przetwarzamy taki plik
        wyłącznie po to, żeby go przetłumaczyć, i kasujemy zgodnie z terminami powyżej.
      </p>

      <h2>10. Automatyczne decyzje</h2>
      <p>
        Nie profilujemy użytkowników i nie podejmujemy wobec nich decyzji w sposób
        automatyczny. Automatyczne są jedynie blokada po serii nieudanych logowań (mija
        po 15 minutach) oraz limity liczby żądań; blokadę konta nakłada człowiek.
      </p>

      <h2>11. Zmiany</h2>
      <p>
        Gdy zmienimy sposób przetwarzania danych, zmienimy też tę stronę i datę na jej
        górze. Wersja obowiązująca to ta, którą tu widzisz.
      </p>

      <footer className="card-foot">
        <span>
          Pytania dotyczące danych: <a href={mailto}>{CONTACT}</a>
        </span>
      </footer>
    </div>
  );
}
