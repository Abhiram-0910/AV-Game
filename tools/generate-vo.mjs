// Voice-over for every dialogue line, generated once with Google Cloud TTS and committed.
//   node tools/generate-vo.mjs              generate missing or stale lines (needs GOOGLE_TTS_API_KEY)
//   node tools/generate-vo.mjs --only <id>  one line, e.g. l3.tataka.appears.0
//   node tools/generate-vo.mjs --check      no API calls; exit 1 if any line is missing or stale
// A line is current when its manifest hash (text + voice + rate + pitch) matches and its file exists, so editing one
// line or recasting one speaker re-calls only those lines. Writes public/audio/vo/<key>.<n>.ogg + manifest.json.
import { createHash } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs'
import { DIALOGUE } from '../src/data/dialogue.ts'

// Recast a speaker here, then re-run. Reasons are in SESSION-LOG (2026-09-14, voice-over).
const CAST = {
  narrator: { voice: 'en-IN-Chirp3-HD-Sulafat', rate: 0.95, pitch: 0 },
  vishwamitra: { voice: 'en-IN-Chirp3-HD-Algenib', rate: 0.92, pitch: -3 },
  dasharatha: { voice: 'en-IN-Chirp3-HD-Alnilam', rate: 0.88, pitch: 0 },
  vasishtha: { voice: 'en-IN-Chirp3-HD-Umbriel', rate: 0.85, pitch: 0 },
  rama: { voice: 'en-IN-Chirp3-HD-Achird', rate: 1.0, pitch: 0 },
  lakshmana: { voice: 'en-IN-Chirp3-HD-Fenrir', rate: 1.05, pitch: 0 },
  tataka: { voice: 'en-IN-Chirp3-HD-Gacrux', rate: 0.85, pitch: -3 },
}
const USD_PER_CHAR = 30 / 1e6 // Chirp 3 HD list price after the free 1M chars/month
const DIR = new URL('../public/audio/vo/', import.meta.url)
const MANIFEST = new URL('manifest.json', DIR)

const args = process.argv.slice(2)
const check = args.includes('--check')
const only = args.includes('--only') ? args[args.indexOf('--only') + 1] : null

const lines = Object.entries(DIALOGUE).flatMap(([key, { speaker, lines }]) =>
  lines.map((text, n) => {
    const cast = CAST[speaker]
    if (!cast) throw new Error(`No voice cast for speaker "${speaker}" (${key})`)
    const hash = createHash('sha256').update(JSON.stringify({ text, ...cast })).digest('hex').slice(0, 16)
    return { id: `${key}.${n}`, text, cast, hash }
  }),
)

mkdirSync(DIR, { recursive: true })
const manifest = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, 'utf8')) : {}
const current = (l) => manifest[l.id]?.hash === l.hash && existsSync(new URL(`${l.id}.ogg`, DIR))
const stale = lines.filter((l) => !current(l) && (!only || l.id === only))

if (only && !lines.some((l) => l.id === only)) throw new Error(`Unknown line id "${only}"`)

if (check) {
  for (const l of stale) console.log(`stale: ${l.id}`)
  console.log(`${stale.length} of ${lines.length} lines need generating`)
  process.exit(stale.length ? 1 : 0)
}

/** Opus duration: last page's granule position minus the OpusHead pre-skip, at 48 kHz. */
function opusSeconds(buf) {
  const granule = buf.readBigInt64LE(buf.lastIndexOf('OggS') + 6)
  const preSkip = buf.readUInt16LE(buf.indexOf('OpusHead') + 10)
  return Number(granule - BigInt(preSkip)) / 48000
}

const escapeXml = (s) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`)

async function synthesize({ text, cast }) {
  const key = process.env.GOOGLE_TTS_API_KEY
  if (!key) throw new Error('GOOGLE_TTS_API_KEY is not set')
  const input = cast.pitch
    ? { ssml: `<speak><prosody pitch="${cast.pitch}st">${escapeXml(text)}</prosody></speak>` }
    : { text }
  const res = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key },
    body: JSON.stringify({
      input,
      voice: { languageCode: 'en-IN', name: cast.voice },
      audioConfig: { audioEncoding: 'OGG_OPUS', speakingRate: cast.rate },
    }),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(`TTS ${res.status}: ${body.error?.message ?? 'unknown error'}`)
  return Buffer.from(body.audioContent, 'base64')
}

let chars = 0
for (const l of stale) {
  const buf = await synthesize(l)
  writeFileSync(new URL(`${l.id}.ogg`, DIR), buf)
  manifest[l.id] = { hash: l.hash, voice: l.cast.voice, bytes: buf.length, seconds: +opusSeconds(buf).toFixed(2) }
  chars += l.text.length
  console.log(`${l.id}  ${l.cast.voice}  ${manifest[l.id].seconds}s  ${buf.length} B`)
}

// Prune lines that no longer exist (a full run only; --only leaves the rest alone).
if (!only) {
  const ids = new Set(lines.map((l) => l.id))
  for (const id of Object.keys(manifest)) if (!ids.has(id)) delete manifest[id]
  for (const f of readdirSync(DIR)) {
    if (f.endsWith('.ogg') && !ids.has(f.slice(0, -4))) rmSync(new URL(f, DIR))
  }
}

const sorted = Object.fromEntries(Object.entries(manifest).sort(([a], [b]) => a.localeCompare(b)))
writeFileSync(MANIFEST, `${JSON.stringify(sorted, null, 2)}\n`)
const all = Object.values(sorted)
const seconds = all.reduce((s, e) => s + e.seconds, 0)
const bytes = all.reduce((s, e) => s + e.bytes, 0)
console.log(`calls ${stale.length} · chars ${chars} · list cost $${(chars * USD_PER_CHAR).toFixed(4)}`)
console.log(`manifest: ${all.length} lines · ${seconds.toFixed(1)} s · ${bytes} B`)
