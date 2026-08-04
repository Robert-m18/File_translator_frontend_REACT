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
})
