import { memo } from 'react'
import type { Tool } from '../../types'
import { BrushSelector } from '../Toolbar/BrushSelector'
import { ColorPalette } from '../Toolbar/ColorPalette'
import { CanvasControls } from './CanvasControls'

interface Props {
  visible: boolean
  color: string
  size: number
  tool: Tool
  canUndo: boolean
  isEmpty: boolean
  onColor: (color: string) => void
  onSize: (size: number) => void
  onTool: (tool: Tool) => void
  onUndo: () => void
  onClear: () => void
}

/**
 * Menú flotante dentro del lienzo para elegir herramientas sin tocar la pantalla:
 * aparece con la mano abierta y cada botón se activa manteniendo el cursor encima.
 */
function GestureMenuBase({ visible, color, size, tool, canUndo, isEmpty, onColor, onSize, onTool, onUndo, onClear }: Props) {
  return (
    <div
      className={`absolute inset-x-2 bottom-2 z-20 flex justify-center transition-all duration-300 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-4 opacity-0'
      }`}
      aria-hidden={!visible}
      inert={!visible}
    >
      <div className="glass flex max-w-full flex-col items-center gap-2.5 rounded-3xl !bg-[#0c0c18]/80 p-2.5 sm:p-3 shadow-2xl">
        <p className="text-[11px] font-semibold tracking-wide text-amber-200">Mantén el cursor sobre una opción para elegirla</p>
        <ColorPalette value={color} onChange={onColor} gestureTargets size="lg" />
        <div className="flex flex-wrap items-center justify-center gap-x-1.5 gap-y-2 sm:gap-x-3">
          <BrushSelector value={size} color={color} onChange={onSize} gestureTargets size="lg" />
          <CanvasControls tool={tool} canUndo={canUndo} isEmpty={isEmpty} onToolChange={onTool} onUndo={onUndo} onClear={onClear} gestureTargets size="lg" />
        </div>
      </div>
    </div>
  )
}

export const GestureMenu = memo(GestureMenuBase)
