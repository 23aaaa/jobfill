import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { copyFileSync, mkdirSync, existsSync, cpSync } from 'fs';

function copyStaticAssets() {
  return {
    name: 'copy-static-assets',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');

      copyFileSync(
        resolve(__dirname, 'public/manifest.json'),
        resolve(dist, 'manifest.json'),
      );
      copyFileSync(
        resolve(__dirname, 'src/background/index.ts'),
        resolve(dist, 'background.js'),
      );

      const iconsOut = resolve(dist, 'icons');
      if (!existsSync(iconsOut)) mkdirSync(iconsOut, { recursive: true });
      const iconsSrc = resolve(__dirname, 'icons');
      if (existsSync(iconsSrc)) {
        cpSync(iconsSrc, iconsOut, { recursive: true });
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), copyStaticAssets()],
  resolve: {
    alias: { '@': resolve(__dirname, 'src') },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    lib: {
      entry: resolve(__dirname, 'src/content/index.tsx'),
      formats: ['iife'],
      name: 'TangShuiJobAssistant',
      fileName: () => 'content.js',
    },
    rollupOptions: {
      output: {
        assetFileNames: (info) => {
          if (info.name?.endsWith('.css')) return 'styles.css';
          return info.name!;
        },
      },
    },
    cssCodeSplit: false,
    minify: true,
  },
  define: {
    'process.env.NODE_ENV': JSON.stringify('production'),
  },
});
