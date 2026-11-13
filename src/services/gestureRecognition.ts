import type { Gesture, Landmark, Point, Settings } from '../types'
import { classifyGesture, gestureAnchor, GestureStabilizer, measureHand } from '../utils/gestureUtils'

export interface GestureResult {
  gesture: Gesture
  anchor: Point
  pinchRatio: number
}

/**
 * Interpreta los puntos de la mano fotograma a fotograma: mide la mano, clasifica
 * el gesto con reglas geométricas y lo estabiliza durante varios fotogramas.
 */
export class GestureRecognizer {
  private stabilizer = new GestureStabilizer()
  private pinching = false

  recognize(landmarks: Landmark[], videoAspect: number, settings: Settings): GestureResult {
    const metrics = measureHand(landmarks, videoAspect)
    const raw = classifyGesture(metrics, settings.pinchThreshold, this.pinching)
    this.pinching = raw === 'pinch'
    // Soltar la pinza debe ser inmediato para no alargar el trazo; el resto de
    // cambios espera a los fotogramas de estabilidad configurados.
    const leavingPinch = this.stabilizer.current === 'pinch' && raw !== 'pinch'
    const gesture = this.stabilizer.update(raw, leavingPinch ? Math.min(2, settings.stabilityFrames) : settings.stabilityFrames)
    return { gesture, anchor: gestureAnchor(landmarks, gesture), pinchRatio: metrics.pinchRatio }
  }

  reset() {
    this.stabilizer.reset()
    this.pinching = false
  }
}
