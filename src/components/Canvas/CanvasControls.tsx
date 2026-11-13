import { Brush, Check, Download, Eraser, Redo2, Trash2, Undo2 } from 'lucide-react'
import { memo, useEffect, useState } from 'react'
import type { Tool } from '../../types'

interface Props {
  tool: Tool
  canUndo: boolean
  canRedo: boolean
  isEmpty: boolean
  onToolChange: (tool: Tool) => void
  onUndo: () => void
  onRedo: () => void
  onClear: () => void
  onDownload?: () => void
  gestureTargets?: boolean
  size?: 'md' | 'lg'
}

function CanvasControlsBase({ tool, canUndo, canRedo, isEmpty, onToolChange, onUndo, onRedo, onClear, onDownload, gestureTargets, size = 'md' }: Props) {
  const dim = size === 'lg' ? 'size-10 sm:size-11' : 'size-10'
  const target = gestureTargets ? '' : undefined
  // Limpiar pide confirmación: el primer toque arma el botón y el segundo borra.
  const [confirming, setConfirming] = useState(false)
  useEffect(() => {
    if (!confirming) return
    const timer = setTimeout(() => setConfirming(false), 3500)
    return () => clearTimeout(timer)
  }, [confirming])
  const handleClear = () => {
    if (confirming) onClear()
    setConfirming(!confirming)
  }
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2 sm:gap-x-3">
      <div className="flex items-center gap-1.5 short:flex-wrap short:justify-center">
      <button type="button" className={`icon-btn ${dim}`} data-active={tool === 'brush'} data-gesture-target={target} onClick={() => onToolChange('brush')} aria-label="Pincel" title="Pincel">
        <Brush className="size-5" />
      </button>
      <button type="button" className={`icon-btn ${dim}`} data-active={tool === 'eraser'} data-gesture-target={target} onClick={() => onToolChange('eraser')} aria-label="Borrador" title="Borrador">
        <Eraser className="size-5" />
      </button>
      </div>
      <div className="flex items-center gap-1.5 short:flex-wrap short:justify-center">
      <button type="button" className={`icon-btn ${dim}`} data-gesture-target={target} onClick={onUndo} disabled={!canUndo} aria-label="Deshacer" title="Deshacer último trazo">
        <Undo2 className="size-5" />
      </button>
      <button type="button" className={`icon-btn ${dim}`} data-gesture-target={target} onClick={onRedo} disabled={!canRedo} aria-label="Rehacer" title="Rehacer">
        <Redo2 className="size-5" />
      </button>
      <div className="relative">
        {confirming && (
          <span className="absolute bottom-full left-1/2 mb-2 -translate-x-1/2 animate-fade-up rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-bold whitespace-nowrap text-white shadow-lg">
            ¿Borrar todo?
          </span>
        )}
        <button
          type="button"
          className={`icon-btn ${dim} ${confirming ? '!border-rose-300 !bg-rose-600 !text-white' : ''}`}
          data-gesture-target={target}
          onClick={handleClear}
          disabled={isEmpty && !confirming}
          aria-label={confirming ? 'Confirmar: limpiar lienzo' : 'Limpiar lienzo'}
          title="Limpiar lienzo"
        >
          {confirming ? <Check className="size-5" strokeWidth={3} /> : <Trash2 className="size-5" />}
        </button>
      </div>
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
          <span className="hidden short:hidden md:inline">PNG</span>
        </button>
      )}
      </div>
    </div>
  )
}

export const CanvasControls = memo(CanvasControlsBase)
