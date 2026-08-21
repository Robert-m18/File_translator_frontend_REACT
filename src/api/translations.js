/**
 * Endpointy tłumaczenia plików. Mechanika (ciasteczka, CSRF, ProblemDetail, ciche
 * odświeżanie tokenu) siedzi w client.js - tutaj są już tylko wywołania.
 */
import { request, upload, downloadFile } from './client';

/**
 * Zleca tłumaczenie. Zwraca zlecenie w stanie oczekującym - plik nie jest jeszcze
 * przetłumaczony, bo wykonuje to kolejka po stronie serwera, więc trzeba odpytywać o status.
 *
 * Nazwy pól multiparta ("file", "targetLang") są kontraktem z kontrolerem - literówka
 * kończy się błędem walidacji, który wygląda jak problem z samym plikiem.
 */
export function submitTranslation({ file, targetLang }) {
  const form = new FormData();
  form.append('file', file);
  form.append('targetLang', targetLang);
  return upload('/translations', form);
}

/** Lista własnych zleceń. Filtrowanie po właścicielu wykonuje serwer, nie front. */
export function listTranslations({ page = 0, size = 20 } = {}) {
  return request(`/translations?page=${page}&size=${size}`);
}

export function getTranslation(id) {
  return request(`/translations/${id}`);
}

/** Zwraca { blob, filename } - nazwę proponuje serwer w Content-Disposition. */
export function downloadTranslation(id) {
  return downloadFile(`/translations/${id}/content`);
}

/**
 * Kasuje zlecenie razem z treścią pliku. Nieodwracalne i tak ma być: to jedyny sposób,
 * żeby użytkownik usunął swój plik z serwera przed upływem retencji.
 */
export function deleteTranslation(id) {
  return request(`/translations/${id}`, { method: 'DELETE' });
}

/**
 * Języki docelowe. Muszą zgadzać się z wyliczeniem TargetLanguage po stronie serwera -
 * wartość spoza listy wraca jako 400 UNSUPPORTED_TARGET_LANGUAGE.
 */
export const TARGET_LANGUAGES = [
  { value: 'EN_GB', label: 'angielski (brytyjski)' },
  { value: 'EN_US', label: 'angielski (amerykański)' },
  { value: 'DE', label: 'niemiecki' },
  { value: 'FR', label: 'francuski' },
  { value: 'ES', label: 'hiszpański' },
  { value: 'IT', label: 'włoski' },
  { value: 'DA', label: 'duński' },
  { value: 'PL', label: 'polski' },
];

/** Statusy, przy których warto odpytywać dalej. Reszta jest stanem końcowym. */
export const PENDING_STATUSES = new Set(['PENDING', 'PROCESSING']);

/**
 * Obsługiwane formaty i ich limity - muszą zgadzać się z wyliczeniem FileType po stronie
 * serwera, ponieważ to on je egzekwuje. Tutaj służą wyłącznie temu, żeby powiedzieć
 * użytkownikowi, czego się spodziewać, zanim wyśle plik - sprawdzenie w przeglądarce niczego
 * nie zabezpiecza. Limity różnią się między tekstem a dokumentami: dla pliku tekstowego bajty to
 * praktycznie znaki, więc limit wynika z budżetu znaków u dostawcy; dla dokumentów liczby
 * znaków nie da się poznać przed wysłaniem, więc limit bajtowy ogranicza szkodę z jednego pliku.
 *
 * Kolejność jak w wyliczeniu FileType po stronie serwera - dwie listy tego samego zbioru
 * czyta się porównując, a nie szukając.
 */
export const SUPPORTED_FORMATS = [
  { extension: '.txt', label: 'tekst', maxLabel: '256 KB' },
  { extension: '.pdf', label: 'PDF', maxLabel: '2 MB' },
  { extension: '.docx', label: 'dokument Worda', maxLabel: '2 MB' },
  { extension: '.xlsx', label: 'arkusz Excela', maxLabel: '2 MB' },
];

/**
 * Wartość atrybutu accept dla pola wyboru pliku.
 *
 * Wartość wyprowadzana jest z listy powyżej, a nie zapisana drugi raz ręcznie. Dwa źródła
 * prawdy o tym samym zbiorze rozjeżdżają się przy dokładaniu formatu w sposób wyjątkowo
 * trudny do zauważenia: podpowiedź pod polem wymienia format, a okno wyboru pliku go
 * odfiltrowuje, więc użytkownik czyta, że format jest obsługiwany, i nie może takiego pliku
 * wskazać. Żaden błąd przy tym nie powstaje, bo żądanie w ogóle nie zostaje wysłane.
 */
export const ACCEPTED_FILE_TYPES = SUPPORTED_FORMATS.map((format) => format.extension).join(',');
