import { CircleDashed, Grab, Hand, MousePointerClick, Pencil, Pointer, type LucideIcon } from 'lucide-react'
import { memo } from 'react'
import type { DrawMode, Gesture } from '../../types'
import { GESTURE_INFO } from '../../utils/gestureUtils'

export const GESTURE_ICONS: Record<Gesture, LucideIcon> = {
  none: CircleDashed,
  point: Pointer,
  pinch: Pencil,
  open: Hand,
  select: MousePointerClick,
  fist: Grab,
}

interface Props {
  gesture: Gesture
  handDetected: boolean
  cameraActive: boolean
  drawMode: DrawMode
  variant?: 'chip' | 'card'
}

function GestureStatusBase({ gesture, handDetected, cameraActive, drawMode, variant = 'card' }: Props) {
  const info = GESTURE_INFO[gesture]
  const Icon = GESTURE_ICONS[gesture]
  let label = info.label
  let hint = info.hint
  if (!cameraActive) {
    label = 'En espera'
    hint = 'Activa la cámara para empezar'
  } else if (!handDetected) {
    label = 'Sin mano'
    hint = 'Muestra tu mano a la cámara'
  } else if (gesture === 'point' && drawMode === 'index') {
    hint = 'Trazando con el índice'
  } else if (gesture === 'point') {
    hint = 'Junta índice y pulgar para trazar'
  }
  const color = cameraActive && handDetected ? info.color : '#64748b'

  if (variant === 'chip') {
    return (
      <div className="glass flex items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-xs font-semibold text-white shadow-lg" role="status" aria-live="polite">
        <span key={gesture} className="grid size-7 animate-fade-in place-items-center rounded-full" style={{ background: `${color}33`, color }}>
          <Icon className="size-4" />
        </span>
        {label}
      </div>
    )
  }

  return (
    <div className="glass flex items-center gap-3 rounded-2xl p-3" role="status" aria-live="polite">
      <span
        key={gesture}
        className="grid size-12 shrink-0 animate-fade-in place-items-center rounded-xl transition-colors"
        style={{ background: `${color}26`, color, boxShadow: `inset 0 0 0 1px ${color}55` }}
      >
        <Icon className="size-6" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase">Gesto actual</p>
        <p className="truncate font-bold text-white">{label}</p>
        <p className="truncate text-xs text-slate-400">{hint}</p>
      </div>
    </div>
  )
}

export const GestureStatus = memo(GestureStatusBase)
