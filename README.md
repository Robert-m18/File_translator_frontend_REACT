# File Translator - frontend

## Uruchomienie całego środowiska (Docker)

Z tego katalogu:

```bash
docker compose up -d --build
```

Wstaje komplet: frontend, backend, PostgreSQL, Mailpit i Redis. Backend nie jest
tu zduplikowany - `docker-compose.yml` wciąga przez `include` plik z repozytorium
backendu, więc obie części opisane są w jednym miejscu, każda u siebie.

| Usługa            | Adres                          |
|-------------------|--------------------------------|
| Frontend          | http://localhost:5173          |
| API               | http://localhost:2009          |
| Skrzynka pocztowa | http://localhost:8025          |
| PostgreSQL        | localhost:5433                 |

Zatrzymanie: `docker compose down` (dane bazy przeżywają w wolumenie;
`down -v` kasuje je razem z nim).

### Gdy backend leży w innym katalogu

Domyślnie szukany jest w `../Downloads/file_translator`. Inną lokalizację podaje
się przez `BACKEND_PATH` - najwygodniej w pliku `.env` obok `docker-compose.yml`:

```
BACKEND_PATH=../../projekty/file_translator
```

### Uwagi

- **Port 5173 jest wymagany**, nie przypadkowy. Backend przepuszcza przez CORS
  wyłącznie `http://localhost:5173`; pod innym adresem przeglądarka odrzuci
  każde żądanie z ciasteczkiem sesji.
- **Kontener i `npm run dev` wykluczają się** - walczą o ten sam port. Do
  codziennej pracy z HMR służy `npm run dev`, kontener do sprawdzenia wersji
  produkcyjnej albo do odpalenia całości jedną komendą.
- **Port 2009 musi być wolny.** Backend uruchomiony wprost z IDE zajmuje go
  i kontener `ft-app` się nie podniesie - trzeba wybrać jedno albo drugie.
- Adres API jest wkompilowywany w bundle podczas budowania obrazu. Zmiana
  wymaga przebudowania (`--build-arg VITE_API_BASE=...`), nie restartu.

## React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is enabled on this template. See [this documentation](https://react.dev/learn/react-compiler) for more information.

Note: This will impact Vite dev & build performances.

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
