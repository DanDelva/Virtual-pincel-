import type { BrushOption, ColorOption, Landmark, Point, Stroke } from '../types'
import { HAND_CONNECTIONS } from './gestureUtils'

export const COLORS: ColorOption[] = [
  { name: 'Negro', value: '#111827' },
  { name: 'Blanco', value: '#ffffff' },
  { name: 'Rojo', value: '#ef4444' },
  { name: 'Azul', value: '#3b82f6' },
  { name: 'Verde', value: '#22c55e' },
  { name: 'Amarillo', value: '#facc15' },
  { name: 'Morado', value: '#a855f7' },
  { name: 'Naranja', value: '#f97316' },
]

export const BRUSHES: BrushOption[] = [
  { name: 'Pequeño', size: 3 },
  { name: 'Mediano', size: 8 },
  { name: 'Grande', size: 16 },
]

export const BACKGROUND_COLORS = { dark: '#12121f', light: '#f8fafc', camera: '#12121f' } as const

/** El borrador es bastante más ancho que el pincel para que resulte cómodo con gestos. */
export const eraserSize = (brushSize: number) => Math.max(28, brushSize * 4)

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

function applyStyle(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  ctx.globalCompositeOperation = stroke.erase ? 'destination-out' : 'source-over'
  ctx.strokeStyle = stroke.erase ? '#000' : stroke.color
  ctx.fillStyle = ctx.strokeStyle
  ctx.lineWidth = stroke.size
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
}

/**
 * Dibuja solo el último tramo de un trazo en curso. Se usan curvas cuadráticas
 * entre puntos medios, lo que interpola las coordenadas y da líneas continuas y suaves.
 */
export function drawLastSegment(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) {
  const pts = stroke.points
  const n = pts.length
  if (n === 0) return
  const px = (p: Point): Point => ({ x: p.x * w, y: p.y * h })
  applyStyle(ctx, stroke)
  ctx.beginPath()
  if (n === 1) {
    const p = px(pts[0])
    ctx.arc(p.x, p.y, stroke.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else if (n === 2) {
    const a = px(pts[0])
    const m = mid(a, px(pts[1]))
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(m.x, m.y)
    ctx.stroke()
  } else {
    const a = px(pts[n - 3])
    const b = px(pts[n - 2])
    const c = px(pts[n - 1])
    const from = mid(a, b)
    const to = mid(b, c)
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(b.x, b.y, to.x, to.y)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

/** Cierra el trazo uniendo el último punto medio con el punto final. */
export function drawStrokeTail(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) {
  const pts = stroke.points
  const n = pts.length
  if (n < 2) return
  const a = { x: pts[n - 2].x * w, y: pts[n - 2].y * h }
  const b = { x: pts[n - 1].x * w, y: pts[n - 1].y * h }
  const m = mid(a, b)
  applyStyle(ctx, stroke)
  ctx.beginPath()
  ctx.moveTo(m.x, m.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
}

/** Dibuja un trazo completo (se usa al redibujar: deshacer, redimensionar, exportar). */
export function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke, w: number, h: number) {
  const pts = stroke.points
  if (pts.length === 0) return
  applyStyle(ctx, stroke)
  ctx.beginPath()
  const first = { x: pts[0].x * w, y: pts[0].y * h }
  if (pts.length === 1) {
    ctx.arc(first.x, first.y, stroke.size / 2, 0, Math.PI * 2)
    ctx.fill()
  } else {
    ctx.moveTo(first.x, first.y)
    for (let i = 1; i < pts.length - 1; i++) {
      const p = { x: pts[i].x * w, y: pts[i].y * h }
      const next = { x: pts[i + 1].x * w, y: pts[i + 1].y * h }
      const m = mid(p, next)
      ctx.quadraticCurveTo(p.x, p.y, m.x, m.y)
    }
    const last = pts[pts.length - 1]
    ctx.lineTo(last.x * w, last.y * h)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}

export function redrawAll(ctx: CanvasRenderingContext2D, strokes: Stroke[], w: number, h: number) {
  ctx.clearRect(0, 0, w, h)
  for (const s of strokes) drawStroke(ctx, s, w, h)
}

/** Esqueleto de la mano sobre la vista de cámara. */
export function drawHandOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: Landmark[] | null,
  w: number,
  h: number,
  color: string,
) {
  ctx.clearRect(0, 0, w, h)
  if (!landmarks) return
  const unit = Math.max(1.5, Math.min(w, h) / 110)
  ctx.lineWidth = unit
  ctx.lineCap = 'round'
  ctx.strokeStyle = 'rgba(255,255,255,0.75)'
  ctx.beginPath()
  for (const [a, b] of HAND_CONNECTIONS) {
    ctx.moveTo(landmarks[a].x * w, landmarks[a].y * h)
    ctx.lineTo(landmarks[b].x * w, landmarks[b].y * h)
  }
  ctx.stroke()
  landmarks.forEach((l, i) => {
    const isTip = i === 4 || i === 8 || i === 12 || i === 16 || i === 20
    ctx.beginPath()
    ctx.fillStyle = isTip ? color : '#ffffff'
    ctx.arc(l.x * w, l.y * h, isTip ? unit * 2 : unit * 1.3, 0, Math.PI * 2)
    ctx.fill()
  })
}

export function downloadCanvasAsPng(source: HTMLCanvasElement, background: string, filename: string) {
  const out = document.createElement('canvas')
  out.width = source.width
  out.height = source.height
  const ctx = out.getContext('2d')
  if (!ctx) return
  ctx.fillStyle = background
  ctx.fillRect(0, 0, out.width, out.height)
  ctx.drawImage(source, 0, 0)
  out.toBlob((blob) => {
    if (!blob) return
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    link.remove()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }, 'image/png')
}
