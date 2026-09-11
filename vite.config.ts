import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'
import { viteStaticCopy } from 'vite-plugin-static-copy'

const src = (dir: string) => fileURLToPath(new URL(`./src/${dir}`, import.meta.url))

function syncPortraits() {
  const brainDir = '/home/yashwanth/snap/antigravity-cli/common/.gemini/antigravity-cli/brain/97a0b010-fe56-475b-8518-f1daa9c803c4'
  const targetDir = fileURLToPath(new URL('./public/assets/portraits', import.meta.url))
  if (!fs.existsSync(brainDir)) return
  if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true })
  const map: Record<string, string> = {
    'rama.png': 'portrait_rama_1789063815542.jpg',
    'dasharatha.png': 'portrait_dasharatha_1789063836704.jpg',
    'vishwamitra.png': 'portrait_vishwamitra_1789063855911.jpg',
    'vasishtha.png': 'portrait_vasishtha_1789064015537.jpg',
    'lakshmana.png': 'portrait_lakshmana_1789064040665.jpg',
  }
  for (const [destName, srcName] of Object.entries(map)) {
    const srcFile = path.join(brainDir, srcName)
    const destFile = path.join(targetDir, destName)
    if (fs.existsSync(srcFile) && !fs.existsSync(destFile)) {
      fs.copyFileSync(srcFile, destFile)
    }
  }
}
syncPortraits()

function syncLowTier() {
  const highDir = fileURLToPath(new URL('./public/assets/high', import.meta.url))
  const lowDir = fileURLToPath(new URL('./public/assets/low', import.meta.url))
  if (!fs.existsSync(highDir)) return
  if (!fs.existsSync(lowDir)) fs.mkdirSync(lowDir, { recursive: true })

  const copyMap: Record<string, string> = {
    'characters/male.glb': 'characters/male-low.glb',
    'characters/female.glb': 'characters/female-low.glb',
  }

  const highManifestFile = path.join(highDir, 'manifest.json')
  if (!fs.existsSync(highManifestFile)) return
  const highManifest = JSON.parse(fs.readFileSync(highManifestFile, 'utf8')) as Record<string, { file: string; tris: number; bytes: number }>

  for (const item of Object.values(highManifest)) {
    const srcRel = copyMap[item.file] && fs.existsSync(path.join(highDir, copyMap[item.file])) ? copyMap[item.file] : item.file
    const src = path.join(highDir, srcRel)
    const dst = path.join(lowDir, item.file)
    const dstSub = path.dirname(dst)
    if (!fs.existsSync(dstSub)) fs.mkdirSync(dstSub, { recursive: true })
    if (fs.existsSync(src) && !fs.existsSync(dst)) {
      fs.copyFileSync(src, dst)
    }
  }
}
syncLowTier()

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
