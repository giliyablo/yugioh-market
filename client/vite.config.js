import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173, // Optional: You can specify the port
    open: true,  // Optional: Automatically open the browser on start-up
  },
})