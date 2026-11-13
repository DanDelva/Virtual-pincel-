import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Point, Stroke, StrokeStyle } from '../types'
import { downloadCanvasAsPng, drawLastSegment, drawStrokeTail, redrawAll } from '../utils/drawingUtils'

const MAX_DPR = 2
/** Movimiento mínimo (px) para añadir un punto: filtra el temblor residual. */
const MIN_STEP = 1.2
/** Un salto mayor que esta fracción del lienzo se considera un error de seguimiento. */
const MAX_JUMP = 0.35

/**
 * Motor de dibujo sobre Canvas 2D. Todo el estado vive en refs: dibujar no
 * provoca renderizados de React y los trazos sobreviven a cualquier actualización
 * de la interfaz o cambio de tamaño (se guardan como vectores normalizados).
 */
export function useDrawing() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null)
  const sizeRef = useRef({ w: 0, h: 0 })
  const strokesRef = useRef<Stroke[]>([])
  const currentRef = useRef<Stroke | null>(null)
  /** Copia previa a "limpiar", para poder deshacerlo. */
  const clearedRef = useRef<Stroke[] | null>(null)
  const [canUndo, setCanUndo] = useState(false)
  const [isEmpty, setIsEmpty] = useState(true)

  const sync = useCallback(() => {
    setCanUndo(strokesRef.current.length > 0 || clearedRef.current !== null)
    setIsEmpty(strokesRef.current.length === 0)
  }, [])

  const redraw = useCallback(() => {
    const ctx = ctxRef.current
    if (!ctx) return
    const { w, h } = sizeRef.current
    redrawAll(ctx, strokesRef.current, w, h)
  }, [])

  /** Ajusta el tamaño interno del canvas a su caja CSS (y a la densidad de píxeles). */
  const resize = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const w = Math.round(rect.width)
    const h = Math.round(rect.height)
    if (w === 0 || h === 0) return
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    if (sizeRef.current.w === w && sizeRef.current.h === h && canvas.width === Math.round(w * dpr)) return
    canvas.width = Math.round(w * dpr)
    canvas.height = Math.round(h * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctxRef.current = ctx
    sizeRef.current = { w, h }
    redraw()
  }, [redraw])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    return () => observer.disconnect()
  }, [resize])

  const endStroke = useCallback(() => {
    const stroke = currentRef.current
    if (!stroke) return
    currentRef.current = null
    const ctx = ctxRef.current
    if (ctx) drawStrokeTail(ctx, stroke, sizeRef.current.w, sizeRef.current.h)
    sync()
  }, [sync])

  const startStroke = useCallback(
    (point: Point, style: StrokeStyle) => {
      endStroke()
      const stroke: Stroke = { ...style, points: [point] }
      currentRef.current = stroke
      strokesRef.current.push(stroke)
      clearedRef.current = null
      const ctx = ctxRef.current
      if (ctx) drawLastSegment(ctx, stroke, sizeRef.current.w, sizeRef.current.h)
    },
    [endStroke],
  )

  const extendStroke = useCallback(
    (point: Point) => {
      const stroke = currentRef.current
      const ctx = ctxRef.current
      if (!stroke || !ctx) return
      const { w, h } = sizeRef.current
      const last = stroke.points[stroke.points.length - 1]
      const dx = point.x - last.x
      const dy = point.y - last.y
      if (Math.hypot(dx * w, dy * h) < MIN_STEP) return
      if (Math.hypot(dx, dy) > MAX_JUMP) {
        const { color, size, erase } = stroke
        startStroke(point, { color, size, erase })
        return
      }
      stroke.points.push(point)
      drawLastSegment(ctx, stroke, w, h)
    },
    [startStroke],
  )

  const undo = useCallback(() => {
    endStroke()
    if (strokesRef.current.length === 0 && clearedRef.current) {
      strokesRef.current = clearedRef.current
      clearedRef.current = null
    } else {
      strokesRef.current.pop()
    }
    redraw()
    sync()
  }, [endStroke, redraw, sync])

  const clear = useCallback(() => {
    endStroke()
    if (strokesRef.current.length === 0) return
    clearedRef.current = strokesRef.current
    strokesRef.current = []
    redraw()
    sync()
  }, [endStroke, redraw, sync])

  const download = useCallback((background: string) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
    downloadCanvasAsPng(canvas, background, `virtual-pincel-${stamp}.png`)
  }, [])

  const isDrawing = useCallback(() => currentRef.current !== null, [])
  const currentStyle = useCallback((): StrokeStyle | null => currentRef.current, [])

  return useMemo(
    () => ({ canvasRef, canUndo, isEmpty, startStroke, extendStroke, endStroke, undo, clear, download, isDrawing, currentStyle }),
    [canUndo, isEmpty, startStroke, extendStroke, endStroke, undo, clear, download, isDrawing, currentStyle],
  )
}

export type DrawingApi = ReturnType<typeof useDrawing>
