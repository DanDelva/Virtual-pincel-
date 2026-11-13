export interface Point {
  x: number
  y: number
}

/** Punto de referencia de MediaPipe (coordenadas normalizadas 0..1 respecto al fotograma). */
export interface Landmark {
  x: number
  y: number
  z: number
}

/**
 * Gestos reconocidos:
 *  - point:  índice levantado (modo dibujo / cursor)
 *  - pinch:  índice y pulgar juntos (trazo)
 *  - open:   mano abierta (pausa + selección de herramientas)
 *  - select: índice y medio levantados (selección)
 *  - fist:   puño cerrado (borrador)
 */
export type Gesture = 'none' | 'point' | 'pinch' | 'open' | 'select' | 'fist'

export type Tool = 'brush' | 'eraser'
export type DrawMode = 'pinch' | 'index'
export type CanvasBackground = 'dark' | 'light' | 'camera'
export type FacingMode = 'user' | 'environment'

export type CameraStatus = 'idle' | 'requesting' | 'active' | 'error'
export type TrackerStatus = 'idle' | 'loading' | 'ready' | 'error'

export interface Settings {
  /** Distancia pulgar–índice (relativa al tamaño de la palma) por debajo de la cual hay pinza. */
  pinchThreshold: number
  /** 0..1 — cuanto mayor, menos hay que mover la mano para recorrer el lienzo. */
  sensitivity: number
  /** 0..1 — cuanto mayor, más suave (y con algo más de retardo) es el cursor. */
  smoothing: number
  /** Fotogramas consecutivos necesarios para confirmar un gesto. */
  stabilityFrames: number
  drawMode: DrawMode
  showLandmarks: boolean
  background: CanvasBackground
}

export interface StrokeStyle {
  color: string
  size: number
  erase: boolean
}

/** Trazo vectorial; los puntos se guardan normalizados (0..1) para sobrevivir a cambios de tamaño. */
export interface Stroke extends StrokeStyle {
  points: Point[]
}

/** Resultado del seguimiento para un fotograma de vídeo. */
export interface HandFrame {
  landmarks: Landmark[]
  gesture: Gesture
  /** Punto de control en coordenadas de cámara (0..1): punta del índice o centro de la palma. */
  anchor: Point
  pinchRatio: number
  videoAspect: number
  time: number
}

export interface ColorOption {
  name: string
  value: string
}

export interface BrushOption {
  name: string
  size: number
}
