import { useCallback, useRef, type RefObject } from 'react'
import type { HandFrame, Settings, Tool } from '../types'
import { cameraToCanvas, PointSmoother } from '../utils/coordinates'
import { drawCensorBlock, drawHandOverlay, eraserSize } from '../utils/drawingUtils'
import { GESTURE_INFO, handBounds } from '../utils/gestureUtils'
import type { DrawingApi } from './useDrawing'

/** Tiempo que hay que mantener el cursor sobre un botón para activarlo con gestos. */
const DWELL_MS = 750
/** Bloqueo tras activar un botón, para evitar activaciones repetidas. */
const COOLDOWN_MS = 900

export type CursorMode = 'draw' | 'erase' | 'select' | 'hover'

export interface LiveState {
  settings: Settings
  color: string
  size: number
  tool: Tool
  mirrored: boolean
}

interface Options {
  liveRef: RefObject<LiveState>
  drawing: DrawingApi
  /** Contenedor del lienzo: define el área que recorre el cursor. */
  stageRef: RefObject<HTMLDivElement | null>
  cursorRef: RefObject<HTMLDivElement | null>
  overlayRef: RefObject<HTMLCanvasElement | null>
  /** Recuadro que tapa la mano sobre el lienzo cuando la cámara está de fondo. */
  censorRef: RefObject<HTMLDivElement | null>
}

/**
 * Traduce cada fotograma de seguimiento en acciones: mover el cursor, trazar,
 * borrar o seleccionar herramientas por permanencia. Trabaja directamente sobre
 * el DOM/canvas mediante refs, sin pasar por el estado de React.
 */
export function useGestureController({ liveRef, drawing, stageRef, cursorRef, overlayRef, censorRef }: Options) {
  const smoother = useRef(new PointSmoother())
  const lastAnchorKind = useRef<'tip' | 'palm'>('tip')
  const dwell = useRef<{ el: HTMLElement | null; start: number }>({ el: null, start: 0 })

  /** Solo se cierran los trazos iniciados por gestos, para no cortar los hechos con el dedo o el ratón. */
  const ownsStroke = useRef(false)
  const endOwnStroke = useCallback(() => {
    if (!ownsStroke.current) return
    ownsStroke.current = false
    drawing.endStroke()
  }, [drawing])

  const resetDwell = useCallback(() => {
    dwell.current.el?.removeAttribute('data-gesture-hover')
    dwell.current = { el: null, start: 0 }
  }, [])

  const updateDwell = useCallback((clientX: number, clientY: number, time: number): number => {
    const hit = document.elementFromPoint(clientX, clientY)?.closest<HTMLElement>('[data-gesture-target]') ?? null
    const target = hit && !(hit as HTMLButtonElement).disabled ? hit : null
    const state = dwell.current
    if (target !== state.el) {
      state.el?.removeAttribute('data-gesture-hover')
      target?.setAttribute('data-gesture-hover', '')
      dwell.current = { el: target, start: time }
      return 0
    }
    if (!target) return 0
    const progress = (time - state.start) / DWELL_MS
    if (progress >= 1) {
      // Tras el bloqueo se puede volver a activar el mismo botón (p. ej. confirmar «limpiar»).
      state.start = time + COOLDOWN_MS
      target.click()
      return 0
    }
    return Math.max(0, progress)
  }, [])

  return useCallback(
    (frame: HandFrame | null) => {
      const live = liveRef.current
      const cursor = cursorRef.current
      const stage = stageRef.current

      // Esqueleto de la mano sobre la vista de cámara.
      const overlay = overlayRef.current
      const octx = overlay?.getContext('2d')
      const censoring = !!frame && frame.obscene && live.settings.censor
      const censorBox = censorRef.current
      if (censorBox && !censoring) censorBox.dataset.visible = 'false'
      if (overlay && octx && censoring) {
        drawCensorBlock(octx, frame.landmarks, overlay.width, overlay.height)
      } else if (overlay && octx) {
        const show = frame && live.settings.showLandmarks
        drawHandOverlay(octx, show ? frame.landmarks : null, overlay.width, overlay.height, frame ? GESTURE_INFO[frame.gesture].color : '#fff')
      }

      if (!frame || !stage) {
        endOwnStroke()
        resetDwell()
        smoother.current.reset()
        if (cursor) cursor.dataset.visible = 'false'
        return
      }

      const rect = stage.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return
      const { settings } = live
      const { gesture } = frame

      // Al pasar de la punta del índice a la palma (puño) se reinicia el filtro para no arrastrar el cursor.
      const anchorKind = gesture === 'fist' ? 'palm' : 'tip'
      if (anchorKind !== lastAnchorKind.current) {
        lastAnchorKind.current = anchorKind
        smoother.current.reset()
        endOwnStroke()
      }

      const mapping = {
        mirror: live.mirrored,
        sensitivity: settings.sensitivity,
        cover: settings.background === 'camera' ? { videoAspect: frame.videoAspect, canvasAspect: rect.width / rect.height } : undefined,
      }
      const mapped = cameraToCanvas(frame.anchor, mapping)

      // Con la cámara de fondo, la mano que hace la seña obscena se tapa también sobre el lienzo.
      if (censorBox && censoring && mapping.cover) {
        const b = handBounds(frame.landmarks, 0.25)
        const p1 = cameraToCanvas({ x: b.minX, y: b.minY }, mapping)
        const p2 = cameraToCanvas({ x: b.maxX, y: b.maxY }, mapping)
        censorBox.dataset.visible = 'true'
        censorBox.style.left = `${Math.min(p1.x, p2.x) * 100}%`
        censorBox.style.top = `${Math.min(p1.y, p2.y) * 100}%`
        censorBox.style.width = `${Math.abs(p2.x - p1.x) * 100}%`
        censorBox.style.height = `${Math.abs(p2.y - p1.y) * 100}%`
      } else if (censorBox) {
        censorBox.dataset.visible = 'false'
      }
      const point = smoother.current.filter(mapped, frame.time, settings.smoothing)

      const tracing = gesture === 'pinch' || (settings.drawMode === 'index' && gesture === 'point')
      const erasing = gesture === 'fist' || (tracing && live.tool === 'eraser')
      const mode: CursorMode = erasing ? 'erase' : tracing ? 'draw' : gesture === 'open' || gesture === 'select' ? 'select' : 'hover'

      const strokeSize = erasing ? eraserSize(live.size) : live.size
      if (mode === 'draw' || mode === 'erase') {
        const style = ownsStroke.current ? drawing.currentStyle() : null
        ownsStroke.current = true
        const changed = !style || style.erase !== erasing || style.color !== live.color || style.size !== strokeSize
        if (changed) drawing.startStroke(point, { color: live.color, size: strokeSize, erase: erasing })
        else drawing.extendStroke(point)
      } else {
        endOwnStroke()
      }

      const x = point.x * rect.width
      const y = point.y * rect.height
      const progress = mode === 'select' ? updateDwell(rect.left + x, rect.top + y, frame.time) : (resetDwell(), 0)

      if (cursor) {
        cursor.dataset.visible = censoring ? 'false' : 'true'
        cursor.dataset.mode = mode
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
        cursor.style.setProperty('--cursor-size', `${Math.max(strokeSize, 10)}px`)
        cursor.style.setProperty('--cursor-color', live.color)
        cursor.style.setProperty('--dwell', `${Math.round(progress * 360)}deg`)
      }
    },
    [liveRef, cursorRef, stageRef, overlayRef, censorRef, drawing, endOwnStroke, resetDwell, updateDwell],
  )
}
