// Prepara los recursos locales de MediaPipe:
//  1. Copia el runtime WASM desde node_modules a public/wasm.
//  2. Descarga el modelo hand_landmarker.task si no existe en public/models.
// Si algo falla, la app usa un CDN como respaldo en tiempo de ejecución.
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const wasmSrc = join(root, 'node_modules/@mediapipe/tasks-vision/wasm')
const wasmDst = join(root, 'public/wasm')
const modelPath = join(root, 'public/models/hand_landmarker.task')
const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task'

const exists = (p) => stat(p).then(() => true, () => false)

try {
  await mkdir(wasmDst, { recursive: true })
  for (const file of await readdir(wasmSrc)) {
    await copyFile(join(wasmSrc, file), join(wasmDst, file))
  }
  console.log('[setup] Runtime WASM de MediaPipe copiado a public/wasm')
} catch (err) {
  console.warn('[setup] No se pudo copiar el runtime WASM (se usará el CDN):', err.message)
}

if (await exists(modelPath)) {
  console.log('[setup] Modelo hand_landmarker.task presente')
} else {
  try {
    const res = await fetch(MODEL_URL)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    await mkdir(dirname(modelPath), { recursive: true })
    await writeFile(modelPath, Buffer.from(await res.arrayBuffer()))
    console.log('[setup] Modelo hand_landmarker.task descargado')
  } catch (err) {
    console.warn('[setup] No se pudo descargar el modelo (se usará la URL remota):', err.message)
  }
}
