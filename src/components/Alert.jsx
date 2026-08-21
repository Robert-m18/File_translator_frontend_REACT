/**
 * Komunikat zwrotny z serwera.
 *
 * Wyświetla identyfikator żądania, jeśli przyszedł w odpowiedzi. Wygląda to na szczegół
 * techniczny wystawiony bez potrzeby, ale jest odwrotnie: bez niego zgłoszenie o błędzie jest
 * nie do odnalezienia w logach serwera, przez które w tej samej sekundzie przewija się
 * wiele wpisów od innych osób. Użytkownik przepisuje kilkanaście znaków, a obsługa ma
 * dokładnie jego żądanie.
 */
export default function Alert({ type = 'info', children, traceId }) {
  return (
    <div className={`alert alert-${type}`} role={type === 'error' ? 'alert' : 'status'}>
      <div>{children}</div>
      {traceId && (
        <div className="alert-trace">
          Kod zgłoszenia: <code>{traceId}</code>
        </div>
      )}
    </div>
  );
}
