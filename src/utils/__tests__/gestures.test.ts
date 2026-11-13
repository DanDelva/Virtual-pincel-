import { describe, expect, it } from 'vitest'
import type { Landmark } from '../../types'
import { cameraToCanvas, PointSmoother } from '../coordinates'
import { classifyGesture, GestureStabilizer, isTwoHandHeart, LM, measureHand } from '../gestureUtils'
import fixtures from './hands.fixture.json'

// Puntos reales obtenidos con MediaPipe Hand Landmarker sobre fotos de ejemplo.
const hands = fixtures as Record<string, { aspect: number; landmarks: Landmark[] }>
const classify = (name: string, threshold = 0.3, wasPinching = false) =>
  classifyGesture(measureHand(hands[name].landmarks, hands[name].aspect), threshold, wasPinching)

describe('clasificación de gestos', () => {
  it('reconoce los gestos básicos', () => {
    expect(classify('pointing_up')).toBe('point')
    expect(classify('victory')).toBe('select')
    expect(classify('fist')).toBe('fist')
    expect(classify('left_hands')).toBe('open')
  })

  it('reconoce pulgar arriba, pulgar abajo y la seña obscena', () => {
    expect(classify('thumb_up')).toBe('like')
    // Pulgar abajo: la misma mano volteada verticalmente.
    const { landmarks, aspect } = hands.thumb_up
    const flipped = landmarks.map((l) => ({ ...l, y: 1 - l.y }))
    expect(classifyGesture(measureHand(flipped, aspect), 0.3, false)).toBe('dislike')
    // Seña obscena: en la foto del índice levantado se intercambian índice y medio.
    const p = hands.pointing_up
    const swapped = p.landmarks.map((l) => ({ ...l }))
    for (let i = 0; i < 4; i++) [swapped[5 + i], swapped[9 + i]] = [swapped[9 + i], swapped[5 + i]]
    expect(classifyGesture(measureHand(swapped, p.aspect), 0.3, false)).toBe('obscene')
    expect(classify('fist')).toBe('fist')
  })

  it('reconoce el corazón a dos manos solo cuando índices y pulgares se tocan', () => {
    const { landmarks, aspect } = hands.left_hands
    expect(isTwoHandHeart(landmarks, landmarks.map((l) => ({ ...l, x: 1 - l.x })), aspect)).toBe(false)
    const hand = (indexX: number, thumbX: number) =>
      landmarks.map((l, i) => (i === LM.INDEX_TIP ? { x: indexX, y: 0.3, z: 0 } : i === LM.THUMB_TIP ? { x: thumbX, y: 0.6, z: 0 } : l))
    expect(isTwoHandHeart(hand(0.49, 0.49), hand(0.51, 0.51), aspect)).toBe(true)
  })

  it('detecta la pinza cuando el pulgar toca el índice, con histéresis', () => {
    const { landmarks, aspect } = hands.pointing_up
    const withThumbAt = (t: number) => {
      const tip = landmarks[LM.INDEX_TIP]
      const thumb = landmarks[LM.THUMB_TIP]
      const moved = landmarks.map((l) => ({ ...l }))
      moved[LM.THUMB_TIP] = { x: thumb.x + (tip.x - thumb.x) * t, y: thumb.y + (tip.y - thumb.y) * t, z: tip.z }
      return measureHand(moved, aspect)
    }
    expect(classifyGesture(withThumbAt(0.9), 0.3, false)).toBe('pinch')
    const near = withThumbAt(0.66) // justo por encima del umbral
    expect(near.pinchRatio).toBeGreaterThan(0.3)
    expect(near.pinchRatio).toBeLessThan(0.3 * 1.35)
    expect(classifyGesture(near, 0.3, false)).toBe('point')
    expect(classifyGesture(near, 0.3, true)).toBe('pinch')
  })
})

describe('estabilizador', () => {
  it('confirma un gesto solo tras N fotogramas consecutivos', () => {
    const s = new GestureStabilizer()
    expect(s.update('point', 3)).toBe('none')
    expect(s.update('point', 3)).toBe('none')
    expect(s.update('fist', 3)).toBe('none') // ruido: reinicia la cuenta
    expect(s.update('point', 3)).toBe('none')
    expect(s.update('point', 3)).toBe('none')
    expect(s.update('point', 3)).toBe('point')
    expect(s.update('open', 3)).toBe('point')
  })
})

describe('coordenadas', () => {
  it('refleja el eje X y amplía la zona activa según la sensibilidad', () => {
    expect(cameraToCanvas({ x: 0.25, y: 0.5 }, { mirror: true, sensitivity: 0 })).toEqual({ x: 0.75, y: 0.5 })
    const p = cameraToCanvas({ x: 0.15, y: 0.85 }, { mirror: false, sensitivity: 0.5 })
    expect(p.x).toBeCloseTo(0)
    expect(p.y).toBeCloseTo(1)
  })

  it('alinea el cursor con el vídeo en modo cámara (cover)', () => {
    // Vídeo 4:3 en un lienzo 3:4: solo se ve la franja central horizontal.
    const p = cameraToCanvas({ x: 0.5, y: 0.2 }, { mirror: true, sensitivity: 1, cover: { videoAspect: 4 / 3, canvasAspect: 3 / 4 } })
    expect(p).toEqual({ x: 0.5, y: 0.2 })
  })

  it('el suavizado converge al valor real', () => {
    const s = new PointSmoother()
    let out = { x: 0, y: 0 }
    for (let i = 0; i < 60; i++) out = s.filter({ x: 0.5, y: 0.5 }, i * 33, 0.5)
    expect(out.x).toBeCloseTo(0.5, 3)
  })
})
