import { memo, useEffect, useRef, type PointerEvent, type ReactNode, type RefObject } from 'react'
import type { DrawingApi } from '../../hooks/useDrawing'
import type { CanvasBackground, Tool } from '../../types'
import { BACKGROUND_COLORS, eraserSize } from '../../utils/drawingUtils'

interface Props {
  drawing: DrawingApi
  stageRef: RefObject<HTMLDivElement | null>
  cursorRef: RefObject<HTMLDivElement | null>
  censorRef: RefObject<HTMLDivElement | null>
  background: CanvasBackground
  /** Flujo de cámara para el fondo «Cámara». */
  stream: MediaStream | null
  mirrored: boolean
  color: string
  size: number
  tool: Tool
  /** Capas de interfaz sobre el lienzo (menú de gestos, avisos…). */
  children?: ReactNode
}

function BackgroundVideo({ stream, mirrored }: { stream: MediaStream; mirrored: boolean }) {
  const ref = useRef<HTMLVideoElement>(null)
  useEffect(() => {
    const video = ref.current
    if (!video) return
    video.srcObject = stream
    void video.play().catch(() => undefined)
    return () => {
      video.srcObject = null
    }
  }, [stream])
  return <video ref={ref} className={`absolute inset-0 size-full object-cover opacity-70 ${mirrored ? '-scale-x-100' : ''}`} playsInline muted autoPlay />
}

function DrawingCanvasBase({ drawing, stageRef, cursorRef, censorRef, background, stream, mirrored, color, size, tool, children }: Props) {
  const pointerId = useRef<number | null>(null)

  // Alternativa táctil / ratón: útil para retocar o si no hay cámara disponible.
  const toPoint = (e: PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    return { x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height }
  }
  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointerId.current !== null || (e.pointerType === 'mouse' && e.button !== 0)) return
    pointerId.current = e.pointerId
    e.currentTarget.setPointerCapture(e.pointerId)
    const erase = tool === 'eraser'
    drawing.startStroke(toPoint(e), { color, size: erase ? eraserSize(size) : size, erase })
  }
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointerId.current !== e.pointerId) return
    const events = e.nativeEvent.getCoalescedEvents?.() ?? []
    if (events.length === 0) drawing.extendStroke(toPoint(e))
    else {
      const rect = e.currentTarget.getBoundingClientRect()
      for (const ev of events) drawing.extendStroke({ x: (ev.clientX - rect.left) / rect.width, y: (ev.clientY - rect.top) / rect.height })
    }
  }
  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    if (pointerId.current !== e.pointerId) return
    pointerId.current = null
    drawing.endStroke()
  }

  const showCamera = background === 'camera' && stream
  return (
    <div
      ref={stageRef}
      className="relative min-h-0 flex-1 overflow-hidden rounded-3xl border border-white/10 shadow-2xl shadow-black/50 transition-colors duration-300"
      style={{ background: BACKGROUND_COLORS[background] }}
    >
      {showCamera ? <BackgroundVideo stream={stream} mirrored={mirrored} /> : <div className="stage-grid absolute inset-0" />}
      <canvas
        ref={drawing.canvasRef}
        className="absolute inset-0 size-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label="Lienzo de dibujo"
      />
      <div ref={censorRef} className="censor-box" data-visible="false" aria-hidden>
        <span>🚫</span>
      </div>
      <div ref={cursorRef} className="gesture-cursor" data-visible="false" data-mode="hover" aria-hidden>
        <div className="cursor-shape" />
      </div>
      {children}
    </div>
  )
}

export const DrawingCanvas = memo(DrawingCanvasBase)
