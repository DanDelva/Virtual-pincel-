import { Brush, Download, Eraser, Trash2, Undo2 } from 'lucide-react'
import { memo } from 'react'
import type { Tool } from '../../types'

interface Props {
  tool: Tool
  canUndo: boolean
  isEmpty: boolean
  onToolChange: (tool: Tool) => void
  onUndo: () => void
  onClear: () => void
  onDownload?: () => void
  gestureTargets?: boolean
  size?: 'md' | 'lg'
}

function CanvasControlsBase({ tool, canUndo, isEmpty, onToolChange, onUndo, onClear, onDownload, gestureTargets, size = 'md' }: Props) {
  const dim = size === 'lg' ? 'size-10 sm:size-11' : 'size-10'
  const target = gestureTargets ? '' : undefined
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" className={`icon-btn ${dim}`} data-active={tool === 'brush'} data-gesture-target={target} onClick={() => onToolChange('brush')} aria-label="Pincel" title="Pincel">
        <Brush className="size-5" />
      </button>
      <button type="button" className={`icon-btn ${dim}`} data-active={tool === 'eraser'} data-gesture-target={target} onClick={() => onToolChange('eraser')} aria-label="Borrador" title="Borrador">
        <Eraser className="size-5" />
      </button>
      <span className="mx-0.5 h-6 w-px bg-white/10" />
      <button type="button" className={`icon-btn ${dim}`} data-gesture-target={target} onClick={onUndo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer último trazo">
        <Undo2 className="size-5" />
      </button>
      <button type="button" className={`icon-btn ${dim}`} data-gesture-target={target} onClick={onClear} disabled={isEmpty} aria-label="Limpiar lienzo" title="Limpiar lienzo">
        <Trash2 className="size-5" />
      </button>
      {onDownload && (
        <button
          type="button"
          className={`btn-primary flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold text-white disabled:opacity-40`}
          data-gesture-target={target}
          onClick={onDownload}
          disabled={isEmpty}
          aria-label="Descargar PNG"
          title="Descargar como PNG"
        >
          <Download className="size-5" />
          <span className="hidden md:inline">PNG</span>
        </button>
      )}
    </div>
  )
}

export const CanvasControls = memo(CanvasControlsBase)
