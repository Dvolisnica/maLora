import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    sourcemap: false,
    rollupOptions: {
      output: {
        // Code-splitting: brže inicijalno učitavanje na mobitelu
        manualChunks: {
          firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/database'],
          charts: ['recharts'],
          motion: ['framer-motion'],
        },
      },
    },
  },
});
