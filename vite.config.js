import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/shopping-spree/', // For GitHub Pages
  test: {
    globals: true,
    environment: 'node',
    // setupFiles: './src/tests/setup.js',
    include: ['src/tests/**/*.{test,spec}.{js,jsx}']
  }
})
