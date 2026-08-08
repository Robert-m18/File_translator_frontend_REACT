# syntax=docker/dockerfile:1

# ---------------------------------------------------------------------------
# Etap 1: budowanie
# Vite tworzy statyczne pliki - HTML, JS, CSS. Node jest potrzebny wyłącznie
# tutaj; w gotowym obrazie nie zostaje po nim ślad.
# ---------------------------------------------------------------------------
# Node 24 - ta sama główna wersja, co na maszynie deweloperskiej.
FROM node:24-alpine AS build
WORKDIR /build

# Najpierw same deskryptory zależności. Dopóki package-lock.json się nie zmieni,
# Docker odtwarza warstwę z node_modules z cache'u zamiast pobierać je od nowa
# przy każdej poprawce w kodzie.
COPY package.json package-lock.json ./
# "npm install", a nie "npm ci" - świadomie, bo tutaj ci NIE MOŻE zadziałać.
#
# package-lock.json powstał na Windowsie, a npm zapisuje w nim tylko te
# zależności opcjonalne, które rozwiązał dla SWOJEJ platformy. Natywne binaria
# rolldown/oxc mają linuksowy wariant awaryjny na WASM (@emnapi/*), którego
# w locku po prostu nie ma - i żadne "npm install --package-lock-only" go tam
# nie dopisze, także z --os=linux --libc=musl. "npm ci" jest z założenia
# bezwzględne: brak wpisu w locku to dla niego błąd i przerywa budowanie.
#
# "npm install" bierze z locka wszystko, co tam jest (czyli wersje całego
# drzewa pozostają przypięte), a dobiera jedynie brakujące binaria pod Linuksa.
RUN npm install --no-audit --no-fund

COPY . .

# Adres API jest WKOMPILOWYWANY w bundle, nie czytany przy starcie kontenera.
# Vite podmienia import.meta.env.VITE_API_BASE na literał już podczas budowania,
# więc zmiana tej wartości wymaga przebudowania obrazu (--build-arg), a nie
# restartu z innym "environment". Domyślne localhost:2009 działa, bo żądania
# wychodzą z PRZEGLĄDARKI użytkownika, a nie z wnętrza kontenera - dla niej
# "localhost" to host, gdzie Compose wystawia port backendu.
ARG VITE_API_BASE=http://localhost:2009
ENV VITE_API_BASE=$VITE_API_BASE

RUN npm run build

# ---------------------------------------------------------------------------
# Etap 2: obraz uruchomieniowy
# Statyczne pliki i nginx - kilkadziesiąt megabajtów zamiast kilkuset.
# ---------------------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /build/dist /usr/share/nginx/html

EXPOSE 80

# Obraz nginxa ma własny ENTRYPOINT (skrypty z /docker-entrypoint.d) i domyślne
# CMD uruchamiające serwer na pierwszym planie - nie ma czego nadpisywać.
