import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { defineConfig } from 'vite';
import { spawn } from 'child_process';

let serverSpawned = false;

export default defineConfig(() => {
  // Spawn the Express development backend in the background if in dev mode
  if (process.env.NODE_ENV !== 'production' && !serverSpawned) {
    serverSpawned = true;
    console.log('Spawning full-stack Express backend server in background on port 3001...');
    const proc = spawn('npx', ['tsx', 'server.ts'], {
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
      // Do not modifyâfile watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable file watching when DISABLE_HMR is true to save CPU during agent edits.
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
      // Proxy client API requests to the custom Express server running on port 3001
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
  };
});
