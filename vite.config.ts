import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { spawn } from 'child_process';

let serverSpawned = false;

export default defineConfig(() => {
  // Spawn the FastAPI development backend in the background if in dev mode
  if (process.env.NODE_ENV !== 'production' && !serverSpawned) {
    serverSpawned = true;
    console.log('Spawning full-stack FastAPI Python backend server in background on port 8000...');
    const proc = spawn('python', ['-m', 'uvicorn', 'backend.main:app', '--reload', '--port', '8000'], {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development' }
    });
    process.on('exit', () => proc.kill());
    process.on('SIGINT', () => proc.kill());
    process.on('SIGTERM', () => proc.kill());
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy client API requests to the Python FastAPI server running on port 8000
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
