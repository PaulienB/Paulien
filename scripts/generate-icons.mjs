import sharp from 'sharp'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PUBLIC = resolve(__dirname, '..', 'public')
mkdirSync(PUBLIC, { recursive: true })

const BG = '#7B68AE'
const FG = '#FAFAF7'

const wineGlassSVG = (size, padding) => {
  const s = size
  const p = padding
  const inner = s - 2 * p
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${s}" height="${s}" viewBox="0 0 ${s} ${s}">
    <rect width="${s}" height="${s}" fill="${BG}"/>
    <g transform="translate(${p},${p}) scale(${inner / 100})">
      <path fill="${FG}" d="M30 8h40l-3 26a17 17 0 0 1-14 16v22h12v6H35v-6h12V50A17 17 0 0 1 33 34L30 8z"/>
    </g>
  </svg>`
}

const renderSquare = async (size, padding, out) => {
  const svg = Buffer.from(wineGlassSVG(size, padding))
  await sharp(svg).png().toFile(resolve(PUBLIC, out))
  console.log(`✓ ${out} (${size}x${size})`)
}

await renderSquare(192, 28, 'icon-192.png')
await renderSquare(512, 72, 'icon-512.png')
await renderSquare(512, 102, 'icon-maskable-512.png')
await renderSquare(180, 26, 'apple-touch-icon.png')
