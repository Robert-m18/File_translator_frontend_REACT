/**
 * Komunikat zwrotny z serwera.
 *
 * Pokazuje traceId, jeśli przyszedł w odpowiedzi. To wygląda na szczegół techniczny
 * wystawiony użytkownikowi bez potrzeby, ale jest odwrotnie: bez tego identyfikatora
 * zgłoszenie "wyskoczył mi błąd" jest nie do odnalezienia w logach serwera, w których
 * w tej samej sekundzie przewinęło się kilkaset linii od innych osób. Użytkownik
 * przepisuje 16 znaków, a my mamy dokładnie jego żądanie.
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
