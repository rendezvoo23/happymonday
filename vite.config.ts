import path from "path";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig({
  assetsInclude: ["**/*.PNG"],
  plugins: [
    react(),
    TanStackRouterVite(),
    VitePWA({
      registerType: "autoUpdate",
      manifestFilename: "site.webmanifest",
      strategies: "injectManifest",
      srcDir: "src",
      filename: "sw.ts",
      devOptions: {
        enabled: true,
        type: "module",
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
      injectManifest: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,webmanifest}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024, // 5MB
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
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React ecosystem
          "react-vendor": ["react", "react-dom", "react-i18next", "i18next"],

          // TanStack ecosystem
          "tanstack-vendor": [
            "@tanstack/react-query",
            "@tanstack/react-router",
          ],

          // Charts and animations
          charts: ["recharts"],
          animations: ["framer-motion"],

          // Supabase and authentication
          supabase: ["@supabase/supabase-js"],

          // UI libraries
          "ui-vendor": [
            "lucide-react",
            "vaul",
            "date-fns",
            "class-variance-authority",
            "clsx",
            "tailwind-merge",
          ],
        },
      },
    },
    // Increase chunk size warning limit
    chunkSizeWarningLimit: 600,
    minify: "esbuild", // Use esbuild instead of terser for faster builds
  },
});
