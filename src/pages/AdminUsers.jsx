import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import { useAuth } from '../auth/context';
import {
  listUsers,
  blockUser,
  unblockUser,
  unlockUser,
  forceLogoutUser,
} from '../api/admin';

const PAGE_SIZE = 20;

/**
 * Polska odmiana przez liczebnik: osobna forma dla 1, dla 2-4 i dla reszty.
 *
 * Wyjątek od "2-4" to NASTKI - 12, 13 i 14 idą do formy mnogiej ("kont", nie "konta"),
 * i to samo dotyczy 112, 113, 114. Stąd warunek na resztach z dzielenia przez 10 ORAZ
 * przez 100; sam mod 10 dawałby "13 konta".
 *
 * Odmieniać trzeba CAŁĄ frazę, nie sam rzeczownik: przymiotnik uzgadnia się z liczebnikiem
 * tak samo ("1 konto pasujące", ale "5 kont pasujących"), więc doklejenie stałego
 * "pasujących" do odmienionego rzeczownika daje zdanie niezgodne samo ze sobą.
 */
function plural(count, one, few, many) {
  const mod10 = count % 10;
  const mod100 = count % 100;

  if (count === 1) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return few;
  return many;
}

/** Czy konto odsiaduje automatyczną blokadę po nieudanych logowaniach. */
function loginLocked(user) {
  return user.lockedUntil != null && new Date(user.lockedUntil) > new Date();
}

function formatDate(value) {
  if (!value) return null;
  return new Date(value).toLocaleString('pl-PL');
}

/**
 * Panel administracyjny - konta użytkowników.
 *
 * TRZY STANY KONTA, KTÓRE TRZEBA ROZRÓŻNIAĆ, i dlatego każdy ma własną odznakę:
 * blokada administracyjna (nie mija sama, zdejmuje ją tylko administrator), blokada po
 * nieudanych logowaniach (mija sama po 15 minutach) i konto aktywne. Zlanie dwóch
 * pierwszych w jedno "zablokowany" sprawiłoby, że administrator zdejmowałby karę
 * w przekonaniu, że odblokowuje kogoś, kto pomylił hasło.
 *
 * WYSZUKIWARKA JEST FORMULARZEM Z PRZYCISKIEM, a nie filtrowaniem przy każdym znaku:
 * każde wciśnięcie klawisza to skan LIKE po kolumnie email w bazie. Przy dziesięciu
 * kontach nie widać różnicy, przy dziesięciu tysiącach widać ją wyłącznie po stronie
 * serwera - czyli tam, gdzie nikt nie patrzy.
 *
 * POWÓD BLOKADY WPISUJE SIĘ W WIERSZU, nie w window.prompt: jest częścią śladu audytowego,
 * który przeczyta następny administrator, więc ma być polem formularza z widoczną etykietą,
 * a nie okienkiem przeglądarki, które da się odklikać w pół sekundy.
 */
export default function AdminUsers() {
  const { user: me } = useAuth();

  const [users, setUsers] = useState([]);
  const [pageInfo, setPageInfo] = useState({ number: 0, totalPages: 0, totalElements: 0 });
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState('');     // zatwierdzony filtr, w locie do serwera
  const [queryDraft, setQueryDraft] = useState(''); // treść pola, jeszcze niezatwierdzona

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const [blockingId, setBlockingId] = useState(null);
  const [reason, setReason] = useState('');

  const refresh = useCallback(async () => {
    setLoading(true);
    /*
     * Komunikat opisuje KONKRETNY wiersz ("Konto odblokowane."), więc nie może przeżyć
     * zmiany tego, co jest na ekranie. Bez tego wisiał nad drugą stroną pagera i nad
     * wynikami nowego wyszukiwania - czyli nad kontami, których nie dotyczy.
     *
     * Miejsce jest bezpieczne, bo refresh NIE JEST wołany po akcjach: te podmieniają
     * pojedynczy wiersz przez replaceRow. Zależność useCallback to [query, page], więc
     * czyścimy dokładnie wtedy, gdy zmienia się zestaw wierszy.
     */
    setNotice(null);
    try {
      const result = await listUsers({ q: query, page, size: PAGE_SIZE });
      setUsers(result.content ?? []);
      setPageInfo({
        number: result.number ?? 0,
        totalPages: result.totalPages ?? 0,
        totalElements: result.totalElements ?? 0,
      });
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [query, page]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  /** Podmienia jeden wiersz odpowiedzią z akcji - bez przeładowania całej listy. */
  function replaceRow(updated) {
    setUsers((current) => current.map((row) => (row.id === updated.id ? updated : row)));
  }

  async function runAction(id, action, message) {
    setBusyId(id);
    setError(null);
    setNotice(null);
    try {
      replaceRow(await action());
      setNotice(message);
    } catch (err) {
      setError(err);
    } finally {
      setBusyId(null);
    }
  }

  function handleSearch(event) {
    event.preventDefault();
    setPage(0); // nowy filtr zawsze od pierwszej strony - inaczej wynik bywa pustą stroną 4
    setQuery(queryDraft.trim());
  }

  async function handleBlock(event, target) {
    event.preventDefault();
    await runAction(
      target.id,
      () => blockUser(target.id, reason.trim()),
      'Konto zablokowane. Sesje zerwane natychmiast.',
    );
    setBlockingId(null);
    setReason('');
  }

  return (
    <div className="card card-wide">
      <header className="card-head row">
        <div>
          <h1>Konta użytkowników</h1>
          <p className="muted">
            {pageInfo.totalElements}{' '}
            {plural(pageInfo.totalElements, 'konto', 'konta', 'kont')}
            {query &&
              ` ${plural(pageInfo.totalElements, 'pasujące', 'pasujące', 'pasujących')} do „${query}”`}
          </p>
        </div>
        <Link className="button button-ghost" to="/dashboard">
          Wróć
        </Link>
      </header>

      <form className="form" onSubmit={handleSearch}>
        <div className="field">
          <label className="label" htmlFor="q">
            Szukaj po adresie email
          </label>
          <input
            id="q"
            className="input"
            type="search"
            value={queryDraft}
            placeholder="fragment adresu, np. kowalski"
            onChange={(event) => setQueryDraft(event.target.value)}
          />
          <p className="field-hint">
            Wielkość liter nie ma znaczenia. Puste pole pokazuje wszystkie konta.
          </p>
        </div>
        <button className="button" type="submit">
          Szukaj
        </button>
      </form>

      {notice && <Alert type="success">{notice}</Alert>}
      {error && (
        <Alert type="error" traceId={error.traceId}>
          {error.message}
        </Alert>
      )}

      {loading ? (
        <Spinner label="Wczytywanie kont…" />
      ) : users.length === 0 ? (
        <Alert type="info">Żadne konto nie pasuje do zapytania.</Alert>
      ) : (
        <ul className="jobs">
          {users.map((row) => {
            const blocked = row.blockedAt != null;
            const locked = loginLocked(row);
            const busy = busyId === row.id;

            return (
              <li key={row.id} className="job">
                <div className="job-main">
                  <span className="job-name">{row.email}</span>
                  <span className="muted">
                    {row.name} · {row.role}
                    {row.id === me?.id && ' · to Ty'}
                  </span>
                  {blocked && (
                    <span className="muted">
                      Zablokowane {formatDate(row.blockedAt)}: {row.blockedReason}
                    </span>
                  )}
                  {locked && (
                    <span className="muted">
                      {row.failedLoginAttempts} nieudanych logowań, blokada do{' '}
                      {formatDate(row.lockedUntil)}
                    </span>
                  )}
                </div>

                <span
                  className={`badge badge-${blocked ? 'failed' : locked ? 'pending' : 'done'}`}
                >
                  {blocked ? 'zablokowane' : locked ? 'blokada logowania' : 'aktywne'}
                </span>

                <div className="job-actions">
                  {blocked ? (
                    <button
                      className="button button-ghost"
                      disabled={busy}
                      onClick={() =>
                        runAction(row.id, () => unblockUser(row.id), 'Konto odblokowane.')
                      }
                    >
                      Odblokuj
                    </button>
                  ) : (
                    <button
                      className="button button-ghost"
                      disabled={busy}
                      onClick={() => {
                        setBlockingId(blockingId === row.id ? null : row.id);
                        setReason('');
                      }}
                    >
                      Zablokuj
                    </button>
                  )}

                  {locked && (
                    <button
                      className="button button-ghost"
                      disabled={busy}
                      onClick={() =>
                        runAction(
                          row.id,
                          () => unlockUser(row.id),
                          'Zdjęto blokadę po nieudanych logowaniach.',
                        )
                      }
                    >
                      Zdejmij blokadę logowania
                    </button>
                  )}

                  <button
                    className="button button-ghost"
                    disabled={busy}
                    onClick={() =>
                      runAction(
                        row.id,
                        () => forceLogoutUser(row.id),
                        // Mówimy prawdę, a nie to, co brzmi lepiej: sesje giną od razu,
                        // ale token dostępowy jest bezstanowy i żyje do 15 minut.
                        'Sesje zerwane. Token dostępowy wygaśnie w ciągu 15 minut.',
                      )
                    }
                  >
                    Wymuś wylogowanie
                  </button>
                </div>

                {blockingId === row.id && (
                  <form className="form job-form" onSubmit={(event) => handleBlock(event, row)}>
                    <div className="field">
                      <label className="label" htmlFor={`reason-${row.id}`}>
                        Powód blokady
                      </label>
                      <input
                        id={`reason-${row.id}`}
                        className="input"
                        value={reason}
                        maxLength={255}
                        placeholder="np. naruszenie regulaminu, zgłoszenie nr 128"
                        onChange={(event) => setReason(event.target.value)}
                      />
                      <p className="field-hint">
                        Zostanie zapisany przy koncie - to jedyne, po czym następna osoba
                        pozna, czy odblokowanie jest bezpieczne. Blokada zrywa sesje
                        natychmiast.
                      </p>
                    </div>
                    <button className="button" type="submit" disabled={!reason.trim() || busy}>
                      {busy ? 'Blokowanie…' : 'Potwierdź blokadę'}
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {pageInfo.totalPages > 1 && (
        <div className="pager">
          <button
            className="button button-ghost"
            disabled={page === 0}
            onClick={() => setPage((current) => current - 1)}
          >
            Poprzednia
          </button>
          <span className="muted">
            Strona {pageInfo.number + 1} z {pageInfo.totalPages}
          </span>
          <button
            className="button button-ghost"
            disabled={page + 1 >= pageInfo.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Następna
          </button>
        </div>
      )}
    </div>
  );
}