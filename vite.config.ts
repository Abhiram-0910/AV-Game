/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const src = (dir: string) => fileURLToPath(new URL(`./src/${dir}`, import.meta.url))

export default defineConfig({
  plugins: [
    react(),
    // Decoders ship in dist/vendor/ and are served at /vendor/ in dev. Loaders (pass 2)
    // point KTX2Loader.setTranscoderPath('/vendor/basis/') and DRACOLoader at '/vendor/draco/'.
    viteStaticCopy({
      targets: [
        { src: 'node_modules/three/examples/jsm/libs/draco/gltf/*', dest: 'vendor/draco' },
        { src: 'node_modules/three/examples/jsm/libs/basis/*', dest: 'vendor/basis' },
      ],
    }),
  ],
  resolve: {
    alias: {
      '@data': src('data'),
      '@core': src('core'),
      '@systems': src('systems'),
      '@entities': src('entities'),
      '@scenes': src('scenes'),
      '@render': src('render'),
      '@ui': src('ui'),
      '@platform': src('platform'),
    },
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
})
