import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // Die Datenbank liegt in data/ – Schreibzugriffe dürfen kein Neuladen auslösen.
  server: { watch: { ignored: ['**/data/**', '**/*.db*'] } },
  build: { target: 'es2022', sourcemap: false },
});
