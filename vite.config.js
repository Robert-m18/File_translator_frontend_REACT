import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  server: {
    /*
     * Port jest ustalony, nie domyślny, i strictPort go pilnuje.
     *
     * Backend przepuszcza przez CORS wyłącznie origin z app.frontend.url (domyślnie
     * http://localhost:5173) i przy allowCredentials=true NIE może użyć "*". Gdyby Vite
     * po zajętym porcie przeskoczył cicho na 5174, każde żądanie zostałoby odrzucone
     * przez przeglądarkę - a w konsoli byłby błąd CORS, nie "zły port", więc szukałoby
     * się przyczyny zupełnie gdzie indziej. Lepiej, żeby serwer deweloperski od razu
     * odmówił startu.
     */
    port: 5173,
    strictPort: true,
  },
  /*
   * Sposób przekształcania JSX podany JAWNIE, mimo że budowanie i tak używał tego nowszego.
   *
   * Potok uruchamiany przy testach dobierał sposób klasyczny, czyli wywołania metody obiektu
   * React - a pliki aplikacji tego obiektu nie importują, bo przy nowszym sposobie nie muszą.
   * Skutkiem było "React is not defined" z pliku aplikacji przy KAŻDYM teście renderującym
   * cokolwiek, mimo że ta sama aplikacja buduje się i działa. Objaw wskazywał linię z JSX,
   * czyli miejsce, w którym nic nie było nie tak.
   *
   * Wpis niczego nie zmienia w budowaniu - zapisuje ustawienie, które tam już obowiązywało,
   * i sprawia, że oba potoki przekształcają JSX tak samo.
   */
  esbuild: { jsx: 'automatic', jsxImportSource: 'react' },
  test: {
    /*
     * Testy chodzą na tej samej konfiguracji co aplikacja, a nie na własnym zestawie narzędzi.
     * Ten sam plugin Reacta, ten sam kompilator, te same reguły przekształcania modułów - więc
     * test wykonuje kod przekształcony dokładnie tak, jak przekształci go budowanie. Osobny
     * potok kompilacji potrafi ukryć albo wymyślić błąd, którego w wydanej aplikacji nie ma.
     */
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    // Bez zmiennych globalnych: describe i expect są importowane wprost, dzięki czemu
    // konfiguracja lintera nie musi ich znać, a w pliku widać, skąd cokolwiek pochodzi.
    globals: false,
    css: false,
  },
})
