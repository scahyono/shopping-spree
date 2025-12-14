import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import buildInfo from './src/buildInfo.json' with { type: 'json' }

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/shopping-spree/', // For GitHub Pages
  build: {
    outDir: 'docs'
  },
  define: {
    'import.meta.env.VITE_BUILD_NUMBER': JSON.stringify(buildInfo.buildNumber)
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/tests/setup.js',
    include: ['src/tests/**/*.{test,spec}.{js,jsx}']
  }
})
