import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react({
      // React refresh performansı için
      fastRefresh: true,
      // Babel optimizasyonları
      babel: {
        plugins: [
          ["@babel/plugin-transform-react-jsx", { runtime: "automatic" }],
        ],
        // Babel optimizasyonları
        presets: [
          ["@babel/preset-env", { loose: true, modules: false }],
          ["@babel/preset-react", { runtime: "automatic" }],
        ],
      },
    }),
  ],
  base: "./",
  build: {
    outDir: "dist",
    assetsDir: ".",
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: mode === "production",
        passes: 2,
      },
      mangle: {
        toplevel: true,
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ["react", "react-dom"],
          // Büyük modülleri ayrı chunk'lara böl
          chess: ["electron-store", "auto-launch"],
        },
        assetFileNames: "assets/[name]-[hash][extname]",
        chunkFileNames: "assets/js/[name]-[hash].js",
        entryFileNames: "assets/js/[name]-[hash].js",
      },
    },
    sourcemap: mode !== "production",
    // Build optimizasyonları
    target: "esnext",
    modulePreload: {
      polyfill: false,
    },
    cssCodeSplit: true,
    reportCompressedSize: false,
  },
  // Development optimizasyonları
  server: {
    port: 5173,
    strictPort: true,
    host: true,
    hmr: {
      protocol: "ws",
      host: "localhost",
      port: 5173,
    },
    watch: {
      usePolling: false,
      ignored: ["**/node_modules/**", "**/dist/**", "**/.git/**"],
      interval: 1000,
    },
  },
  // Dependency optimizasyonları
  optimizeDeps: {
    include: ["react", "react-dom"],
    exclude: ["electron"],
    esbuildOptions: {
      target: "esnext",
      supported: {
        bigint: true,
      },
    },
    force: false,
    disabled: false,
  },
  // Esbuild optimizasyonları
  esbuild: {
    jsxInject: `import React from 'react'`, // Otomatik React import
    legalComments: "none",
    target: "esnext",
    treeShaking: true,
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  },
}));
