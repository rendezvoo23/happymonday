import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.PNG"],
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "site.webmanifest",
      devOptions: {
        enabled: true,
      },
      includeAssets: [
        "favicon.ico",
        "favicon.svg",
        "apple-touch-icon.png",
        "safari-pinned-tab.svg",
      ],
      manifest: {
        name: "WhySpent",
        short_name: "WhySpent",
        description: "A simple personal finance tracking app",
        theme_color: "#F5F5F7",
        background_color: "#F5F5F7",
        display: "standalone",
        icons: [
          {
            src: "android-chrome-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "android-chrome-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    allowedHosts: ["subtrifid-krystyna-suspensively.ngrok-free.dev"],
  },
});
