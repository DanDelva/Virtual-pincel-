import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision'
import type { Landmark } from '../types'

const BASE = import.meta.env.BASE_URL

/** Primero se intentan los recursos locales (sin red); si faltan, se recurre al CDN. */
const SOURCES = [
  { wasm: `${BASE}wasm`, model: `${BASE}models/hand_landmarker.task` },
  {
    wasm: 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.2.3/wasm',
    model:
      'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
  },
]

type Delegate = 'GPU' | 'CPU'

async function create(delegate: Delegate): Promise<HandLandmarker> {
  let lastError: unknown
  for (const source of SOURCES) {
    try {
      const fileset = await FilesetResolver.forVisionTasks(source.wasm)
      return await HandLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: source.model, delegate },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.6,
        minHandPresenceConfidence: 0.6,
        minTrackingConfidence: 0.6,
      })
    } catch (err) {
      lastError = err
    }
  }
  throw lastError ?? new Error('No se pudo cargar el modelo de manos')
}

/**
 * Envoltorio sobre MediaPipe Hand Landmarker. Usa GPU cuando está disponible y
 * cambia a CPU automáticamente si la GPU falla al crear o durante la detección.
 */
export class HandDetector {
  private landmarker: HandLandmarker | null = null
  private delegate: Delegate = 'GPU'
  private lastTimestamp = 0
  private recovering = false

  static async load(): Promise<HandDetector> {
    const detector = new HandDetector()
    try {
      detector.landmarker = await create('GPU')
    } catch {
      detector.delegate = 'CPU'
      detector.landmarker = await create('CPU')
    }
    return detector
  }

  /** Devuelve los 21 puntos de cada mano detectada (hasta dos), o null si no hay ninguna. */
  detect(video: HTMLVideoElement, timestampMs: number): Landmark[][] | null {
    if (!this.landmarker || this.recovering) return null
    // MediaPipe exige marcas de tiempo estrictamente crecientes.
    const ts = Math.max(timestampMs, this.lastTimestamp + 1)
    this.lastTimestamp = ts
    try {
      const result = this.landmarker.detectForVideo(video, ts)
      return result.landmarks.length > 0 ? result.landmarks : null
    } catch (err) {
      if (this.delegate === 'GPU') {
        void this.fallbackToCpu()
        return null
      }
      throw err
    }
  }

  private async fallbackToCpu() {
    this.recovering = true
    this.delegate = 'CPU'
    try {
      this.landmarker?.close()
    } catch {
      /* ya cerrado */
    }
    this.landmarker = null
    try {
      this.landmarker = await create('CPU')
    } finally {
      this.recovering = false
    }
  }

  close() {
    try {
      this.landmarker?.close()
    } catch {
      /* ya cerrado */
    }
    this.landmarker = null
  }
}
