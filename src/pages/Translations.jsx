import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import Alert from '../components/Alert';
import Spinner from '../components/Spinner';
import {
  submitTranslation,
  listTranslations,
  downloadTranslation,
  deleteTranslation,
  TARGET_LANGUAGES,
  PENDING_STATUSES,
  SUPPORTED_FORMATS,
  ACCEPTED_FILE_TYPES,
} from '../api/translations';

const STATUS_LABEL = {
  PENDING: 'w kolejce',
  PROCESSING: 'tłumaczę…',
  DONE: 'gotowe',
  FAILED: 'nie udało się',
};

/** Co ile odpytujemy o status. Zgrane z app.translation.poll-interval po stronie serwera. */
const POLL_MS = 2000;

/**
 * Tłumaczenie plików.
 *
 * PRZETWARZANIE JEST ASYNCHRONICZNE i to kształtuje cały ten ekran: POST zwraca 202
 * i identyfikator, a nie wynik. Plik tłumaczy worker po stronie serwera, więc lista musi
 * się sama odświeżać, dopóki cokolwiek jest w stanie PENDING/PROCESSING.
 *
 * Odpytywanie ZATRZYMUJE SIĘ SAMO, gdy nie ma już czego pilnować - inaczej otwarta
 * w tle karta biłaby w API co dwie sekundy przez cały dzień. Serwer wysyła zresztą maila
 * po zakończeniu, więc użytkownik nie musi tu siedzieć i patrzeć.
 */
export default function Translations() {
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [file, setFile] = useState(null);
  const [targetLang, setTargetLang] = useState('EN_GB');
  const [sending, setSending] = useState(false);
  const fileInput = useRef(null);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!quiet) setLoading(true);
    try {
      const page = await listTranslations();
      setJobs(page.content ?? []);
      setError(null);
    } catch (err) {
      setError(err);
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Odpytywanie tylko wtedy, gdy cokolwiek jest jeszcze w toku. quiet: true, żeby lista
  // nie migała spinnerem co dwie sekundy.
  useEffect(() => {
    const waiting = jobs.some((job) => PENDING_STATUSES.has(job.status));
    if (!waiting) return undefined;

    const timer = setInterval(() => refresh({ quiet: true }), POLL_MS);
    return () => clearInterval(timer);
  }, [jobs, refresh]);

  async function handleSubmit(event) {
    event.preventDefault();
    if (!file) return;

    setSending(true);
    setError(null);
    setNotice(null);
    try {
      await submitTranslation({ file, targetLang });
      setNotice('Zlecenie przyjęte. Wynik pojawi się na liście za chwilę.');
      setFile(null);
      if (fileInput.current) fileInput.current.value = '';
      await refresh({ quiet: true });
    } catch (err) {
      setError(err);
    } finally {
      setSending(false);
    }
  }

  /**
   * Pobiera plik przez fetch i zapisuje go z pamięci.
   *
   * Zwykły odnośnik nie zadziała: atrybut download jest ignorowany dla innego origin,
   * więc plik otworzyłby się w karcie zamiast trafić na dysk. Szczegóły w client.js.
   */
  async function handleDownload(job) {
    setError(null);
    try {
      const { blob, filename } = await downloadTranslation(job.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.click();
      // Bez tego obiekt trzyma całą treść pliku w pamięci karty do jej zamknięcia
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err);
    }
  }

  async function handleDelete(job) {
    setError(null);
    setNotice(null);
    try {
      await deleteTranslation(job.id);
      setNotice(`Usunięto zlecenie „${job.originalFilename}” razem z treścią pliku.`);
      await refresh({ quiet: true });
    } catch (err) {
      setError(err);
    }
  }

  return (
    <div className="card card-wide">
      <header className="card-head row">
        <div>
          <h1>Tłumaczenie plików</h1>
          <p className="muted">
            {SUPPORTED_FORMATS.map((format) => `${format.extension} do ${format.maxLabel}`).join(', ')}
          </p>
        </div>
        <Link className="button button-ghost" to="/dashboard">
          Wróć
        </Link>
      </header>

      <form className="form" onSubmit={handleSubmit}>
        <div className="field">
          <label className="label" htmlFor="file">
            Plik
          </label>
          <input
            id="file"
            className="input"
            type="file"
            accept={ACCEPTED_FILE_TYPES}
            ref={fileInput}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
          <p className="field-hint">
            O formacie decyduje ZAWARTOŚĆ pliku, nie jego nazwa - z jednym wyjątkiem: dokument
            Worda i arkusz Excela są w środku tym samym rodzajem archiwum, więc rozróżnia je
            dopiero rozszerzenie. Arkusz nazwany .docx zostanie odrzucony przez tłumacza.
            Plik tekstowy zapisany w innym kodowaniu niż UTF-8 zostanie odrzucony, inaczej
            polskie znaki trafiłyby do tłumaczenia jako krzaki. PDF, dokument i arkusz wracają
            w tym samym formacie, z zachowanym układem.
          </p>
        </div>

        <div className="field">
          <label className="label" htmlFor="targetLang">
            Język docelowy
          </label>
          <select
            id="targetLang"
            className="input"
            value={targetLang}
            onChange={(event) => setTargetLang(event.target.value)}
          >
            {TARGET_LANGUAGES.map((lang) => (
              <option key={lang.value} value={lang.value}>
                {lang.label}
              </option>
            ))}
          </select>
        </div>

        <button className="button" type="submit" disabled={!file || sending}>
          {sending ? 'Wysyłanie…' : 'Przetłumacz'}
        </button>
      </form>

      {notice && <Alert type="success">{notice}</Alert>}
      {error && (
        <Alert type="error" traceId={error.traceId}>
          {error.message}
        </Alert>
      )}

      <h2 className="jobs-title">Twoje zlecenia</h2>

      {loading ? (
        <Spinner label="Wczytywanie zleceń…" />
      ) : jobs.length === 0 ? (
        <Alert type="info">Nie masz jeszcze żadnych zleceń.</Alert>
      ) : (
        <ul className="jobs">
          {jobs.map((job) => (
            <li key={job.id} className="job">
              <div className="job-main">
                <span className="job-name">{job.originalFilename}</span>
                <span className="muted">
                  {/*
                    Dla dokumentów liczba znaków jest ZERO do chwili zakończenia i nie jest to
                    błąd: liczby znaków w PDF-ie nie da się poznać bez otwarcia go, więc podaje
                    ją dopiero dostawca razem z wynikiem. Pokazywanie "0 znaków" przy zleceniu
                    w toku wyglądałoby na pusty plik.
                  */}
                  {job.charCount > 0 ? `${job.charCount} znaków` : 'liczba znaków po przetłumaczeniu'}
                  {' → '}
                  {job.targetLang.replace('_', '-')}
                </span>
              </div>

              <span className={`badge badge-${job.status.toLowerCase()}`}>
                {STATUS_LABEL[job.status] ?? job.status}
              </span>

              <div className="job-actions">
                {job.status === 'DONE' && (
                  <button className="button button-ghost" onClick={() => handleDownload(job)}>
                    Pobierz
                  </button>
                )}
                <button className="button button-ghost" onClick={() => handleDelete(job)}>
                  Usuń
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
