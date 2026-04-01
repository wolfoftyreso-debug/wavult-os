import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['@xyflow/react'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    // Target modern browsers including iOS Safari 14+
    target: ['es2020', 'safari14', 'chrome87', 'firefox78'],
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
        },
      },
    },
    chunkSizeWarningLimit: 600,
  },
})
