import { memo } from 'react'
import type { DrawMode, Gesture } from '../../types'
import { GESTURE_INFO } from '../../utils/gestureUtils'
import { GESTURE_ICONS } from './GestureStatus'

const ORDER: Gesture[] = ['point', 'pinch', 'open', 'select', 'fist']

function describe(gesture: Gesture, drawMode: DrawMode): string {
  switch (gesture) {
    case 'point':
      return drawMode === 'index' ? 'Dibuja directamente con la punta del índice.' : 'Mueve el cursor por el lienzo sin pintar.'
    case 'pinch':
      return 'Junta índice y pulgar para trazar; sepáralos para soltar.'
    case 'open':
      return 'Detiene el dibujo y muestra el menú de herramientas.'
    case 'select':
      return 'Índice y medio arriba: mantén el cursor sobre una opción para elegirla.'
    case 'fist':
      return 'Mueve el puño sobre el dibujo para borrar.'
    default:
      return ''
  }
}

function GestureGuideBase({ active, drawMode }: { active?: Gesture; drawMode: DrawMode }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {ORDER.map((g) => {
        const Icon = GESTURE_ICONS[g]
        const info = GESTURE_INFO[g]
        const on = active === g
        return (
          <li
            key={g}
            className={`flex items-center gap-3 rounded-xl border px-2.5 py-2 transition-colors duration-200 ${on ? 'border-white/20 bg-white/10' : 'border-transparent'}`}
          >
            <span className="grid size-9 shrink-0 place-items-center rounded-lg" style={{ background: `${info.color}22`, color: info.color }}>
              <Icon className="size-[18px]" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white">{info.label}</p>
              <p className="text-xs leading-snug text-slate-400">{describe(g, drawMode)}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}

export const GestureGuide = memo(GestureGuideBase)
