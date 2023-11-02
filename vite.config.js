import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import basicSsl from '@vitejs/plugin-basic-ssl'


// https://vitejs.dev/config/
export default defineConfig({
  server: { port: 9898 },
  plugins: [
    vue(),
    basicSsl()
  ],
  build: {
    sourcemap: true,
    devToolsEnabled: true
  }
})
