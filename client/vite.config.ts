import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Load env variables from .env files
  const env = loadEnv(mode, process.cwd(), '');

  // Log to check if the variable is loaded
  console.log("API Base URL from .env:", env.VITE_API_URL);

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        '/api': {
          target: env.VITE_API_URL, 
          changeOrigin: true, 
          secure: false,
        },
      },
    },
  };
});
