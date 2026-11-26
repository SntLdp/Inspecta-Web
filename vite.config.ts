import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "INSPECTA",
        short_name: "INSPECTA",
        description: "Gestión de inspecciones de seguridad e higiene laboral",
        theme_color: "#16324F",
        background_color: "#F4F7FA",
        display: "standalone"
      },
      workbox: {
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    })
  ]
});