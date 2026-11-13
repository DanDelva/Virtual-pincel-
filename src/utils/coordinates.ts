import type { Point } from '../types'

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

interface MapOptions {
  /** Refleja el eje X (cámara frontal → efecto espejo). */
  mirror: boolean
  /** 0..1: recorta los bordes del encuadre para llegar a todo el lienzo con menos movimiento. */
  sensitivity: number
  /**
   * Si se indica, la cámara se muestra de fondo en el lienzo (object-fit: cover)
   * y el cursor debe coincidir exactamente con la mano en pantalla.
   */
  cover?: { videoAspect: number; canvasAspect: number }
}

/** Convierte un punto de cámara (0..1) a coordenadas normalizadas del lienzo (0..1). */
export function cameraToCanvas(p: Point, { mirror, sensitivity, cover }: MapOptions): Point {
  let x = mirror ? 1 - p.x : p.x
  let y = p.y

  if (cover) {
    const { videoAspect, canvasAspect } = cover
    if (videoAspect > canvasAspect) {
      const visible = canvasAspect / videoAspect
      x = (x - (1 - visible) / 2) / visible
    } else {
      const visible = videoAspect / canvasAspect
      y = (y - (1 - visible) / 2) / visible
    }
  } else {
    const margin = clamp(sensitivity, 0, 1) * 0.3
    const span = 1 - margin * 2
    x = (x - margin) / span
    y = (y - margin) / span
  }
  return { x: clamp(x, 0, 1), y: clamp(y, 0, 1) }
}

class LowPass {
  private value: number | null = null
  filter(x: number, alpha: number): number {
    this.value = this.value === null ? x : alpha * x + (1 - alpha) * this.value
    return this.value
  }
  reset() {
    this.value = null
  }
}

/**
 * Filtro "One Euro" (Casiez et al.): suaviza mucho cuando la mano va despacio
 * (elimina el temblor) y poco cuando va rápido (evita retardo).
 */
class OneEuro {
  private x = new LowPass()
  private dx = new LowPass()
  private last: number | null = null
  private lastTime = 0

  filter(value: number, timeMs: number, minCutoff: number, beta: number): number {
    const dt = this.last === null ? 1 / 30 : clamp((timeMs - this.lastTime) / 1000, 1 / 240, 0.2)
    const alpha = (cutoff: number) => {
      const tau = 1 / (2 * Math.PI * cutoff)
      return 1 / (1 + tau / dt)
    }
    const derivative = this.last === null ? 0 : (value - this.last) / dt
    const edx = this.dx.filter(derivative, alpha(1))
    const result = this.x.filter(value, alpha(minCutoff + beta * Math.abs(edx)))
    this.last = result
    this.lastTime = timeMs
    return result
  }

  reset() {
    this.x.reset()
    this.dx.reset()
    this.last = null
  }
}

export class PointSmoother {
  private fx = new OneEuro()
  private fy = new OneEuro()

  /** `smoothing` 0..1 (0 = respuesta inmediata, 1 = máximo suavizado). */
  filter(p: Point, timeMs: number, smoothing: number): Point {
    const s = clamp(smoothing, 0, 1)
    const minCutoff = 6 - s * 5.4 // 6 Hz … 0.6 Hz
    const beta = 14 - s * 8
    return {
      x: this.fx.filter(p.x, timeMs, minCutoff, beta),
      y: this.fy.filter(p.y, timeMs, minCutoff, beta),
    }
  }

  reset() {
    this.fx.reset()
    this.fy.reset()
  }
}
