import type { Gesture, Landmark, Point } from '../types'

/** Índices de los 21 puntos de referencia de MediaPipe Hands. */
export const LM = {
  WRIST: 0,
  THUMB_TIP: 4,
  INDEX_MCP: 5,
  INDEX_PIP: 6,
  INDEX_TIP: 8,
  MIDDLE_MCP: 9,
  MIDDLE_PIP: 10,
  MIDDLE_TIP: 12,
  RING_MCP: 13,
  RING_PIP: 14,
  RING_TIP: 16,
  PINKY_MCP: 17,
  PINKY_PIP: 18,
  PINKY_TIP: 20,
} as const

export const HAND_CONNECTIONS: ReadonlyArray<readonly [number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20],
  [0, 17],
]

const EXTENDED_ANGLE = 150
const CURLED_ANGLE = 125
/** La pinza se suelta con un umbral algo mayor que el de activación (histéresis). */
export const PINCH_RELEASE_FACTOR = 1.35

/**
 * Las coordenadas de MediaPipe están normalizadas por separado en ancho y alto;
 * se corrige con la relación de aspecto para medir distancias y ángulos reales.
 */
function toMetric(l: Landmark, aspect: number): Landmark {
  return { x: l.x * aspect, y: l.y, z: l.z * aspect }
}

function dist2(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function dist3(a: Landmark, b: Landmark): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}

/** Ángulo (grados) en el vértice `b` formado por a–b–c. */
function angleAt(a: Landmark, b: Landmark, c: Landmark): number {
  const v1 = [a.x - b.x, a.y - b.y, a.z - b.z]
  const v2 = [c.x - b.x, c.y - b.y, c.z - b.z]
  const dot = v1[0] * v2[0] + v1[1] * v2[1] + v1[2] * v2[2]
  const mag = Math.hypot(...v1) * Math.hypot(...v2)
  if (mag === 0) return 180
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI
}

export interface HandMetrics {
  /** Distancia pulgar–índice dividida por el tamaño de la palma. */
  pinchRatio: number
  fingers: { index: FingerState; middle: FingerState; ring: FingerState; pinky: FingerState }
  /** Distancia punta del índice – nudillo del índice, relativa a la palma. */
  indexReach: number
}

export type FingerState = 'extended' | 'curled' | 'partial'

function fingerState(mcp: Landmark, pip: Landmark, tip: Landmark): FingerState {
  const angle = angleAt(mcp, pip, tip)
  if (angle >= EXTENDED_ANGLE) return 'extended'
  if (angle <= CURLED_ANGLE) return 'curled'
  return 'partial'
}

export function measureHand(landmarks: Landmark[], aspect: number): HandMetrics {
  const p = landmarks.map((l) => toMetric(l, aspect))
  // Tamaño de palma robusto ante inclinaciones: el mayor entre su largo y su ancho.
  const palm = Math.max(dist2(p[LM.WRIST], p[LM.MIDDLE_MCP]), dist2(p[LM.INDEX_MCP], p[LM.PINKY_MCP]), 1e-6)
  return {
    pinchRatio: dist2(p[LM.THUMB_TIP], p[LM.INDEX_TIP]) / palm,
    indexReach: dist3(p[LM.INDEX_TIP], p[LM.INDEX_MCP]) / palm,
    fingers: {
      index: fingerState(p[LM.INDEX_MCP], p[LM.INDEX_PIP], p[LM.INDEX_TIP]),
      middle: fingerState(p[LM.MIDDLE_MCP], p[LM.MIDDLE_PIP], p[LM.MIDDLE_TIP]),
      ring: fingerState(p[LM.RING_MCP], p[LM.RING_PIP], p[LM.RING_TIP]),
      pinky: fingerState(p[LM.PINKY_MCP], p[LM.PINKY_PIP], p[LM.PINKY_TIP]),
    },
  }
}

/**
 * Clasifica un único fotograma mediante reglas geométricas.
 * `wasPinching` aplica histéresis para que la pinza no parpadee cerca del umbral.
 */
export function classifyGesture(m: HandMetrics, pinchThreshold: number, wasPinching: boolean): Gesture {
  const { index, middle, ring, pinky } = m.fingers
  const ext = (f: FingerState) => f === 'extended'

  // Puño: los cuatro dedos recogidos y la punta del índice pegada a su nudillo
  // (esto lo distingue de una pinza con el resto de dedos cerrados).
  if (index !== 'extended' && middle === 'curled' && ring === 'curled' && pinky !== 'extended' && m.indexReach < 0.55) {
    return 'fist'
  }

  const limit = wasPinching ? pinchThreshold * PINCH_RELEASE_FACTOR : pinchThreshold
  if (m.pinchRatio < limit) return 'pinch'

  if (ext(index) && ext(middle) && ext(ring) && ext(pinky)) return 'open'
  if (ext(index) && ext(middle) && !ext(ring) && !ext(pinky)) return 'select'
  if (ext(index) && !ext(middle) && !ext(ring)) return 'point'
  return 'none'
}

/**
 * Filtro de estabilidad: un gesto nuevo solo se confirma tras verse
 * `frames` fotogramas consecutivos, evitando activaciones accidentales.
 */
export class GestureStabilizer {
  private stable: Gesture = 'none'
  private candidate: Gesture = 'none'
  private count = 0

  update(raw: Gesture, frames: number): Gesture {
    if (raw === this.stable) {
      this.candidate = raw
      this.count = 0
      return this.stable
    }
    if (raw === this.candidate) {
      this.count += 1
    } else {
      this.candidate = raw
      this.count = 1
    }
    if (this.count >= Math.max(1, frames)) {
      this.stable = raw
      this.count = 0
    }
    return this.stable
  }

  get current(): Gesture {
    return this.stable
  }

  reset(): void {
    this.stable = 'none'
    this.candidate = 'none'
    this.count = 0
  }
}

/** Punto que controla el cursor: centro de la palma con el puño, punta del índice en el resto. */
export function gestureAnchor(landmarks: Landmark[], gesture: Gesture): Point {
  if (gesture === 'fist') {
    const a = landmarks[LM.WRIST]
    const b = landmarks[LM.MIDDLE_MCP]
    return { x: (a.x + b.x * 2) / 3, y: (a.y + b.y * 2) / 3 }
  }
  const tip = landmarks[LM.INDEX_TIP]
  return { x: tip.x, y: tip.y }
}

export const GESTURE_INFO: Record<Gesture, { label: string; hint: string; color: string }> = {
  none: { label: 'Sin gesto', hint: 'Levanta el índice para pintar', color: '#94a3b8' },
  point: { label: 'Índice levantado', hint: 'Modo dibujo: mueve el cursor', color: '#22d3ee' },
  pinch: { label: 'Pinza', hint: 'Trazando sobre el lienzo', color: '#a78bfa' },
  open: { label: 'Mano abierta', hint: 'Pausa · apunta a una herramienta', color: '#34d399' },
  select: { label: 'Selección', hint: 'Mantén el cursor sobre una opción', color: '#fbbf24' },
  fist: { label: 'Puño cerrado', hint: 'Borrador activo', color: '#fb7185' },
}
