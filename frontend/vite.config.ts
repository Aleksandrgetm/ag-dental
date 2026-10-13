import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import vuetify from 'vite-plugin-vuetify'

export default defineConfig({
  plugins: [
    vue(),
    vuetify(),
  ],

  // Plugin-generated deep imports in lazy routes must be optimized at startup.
  // Otherwise first navigation can trigger Vite's dependency-reload fallback.
  optimizeDeps: { include: ['vuetify/components/VApp', 'vuetify/components/VMain', 'vuetify/components/VIcon'] },

  server: {
    allowedHosts: ['.trycloudflare.com'],
  },
})