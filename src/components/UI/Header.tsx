import { Brush, Settings2 } from 'lucide-react'
import { memo, type ReactNode } from 'react'
import type { CameraStatus } from '../../types'

const STATUS: Record<CameraStatus, { label: string; dot: string }> = {
  idle: { label: 'Cámara apagada', dot: 'bg-slate-500' },
  requesting: { label: 'Solicitando permiso…', dot: 'bg-amber-400 animate-pulse' },
  active: { label: 'Cámara activa', dot: 'bg-emerald-400 animate-pulse' },
  error: { label: 'Error de cámara', dot: 'bg-rose-500' },
}

interface Props {
  cameraStatus: CameraStatus
  fps: number
  onOpenSettings: () => void
  /** Controles de cámara compactos (se muestran en pantallas pequeñas). */
  children?: ReactNode
}

function HeaderBase({ cameraStatus, fps, onOpenSettings, children }: Props) {
  const status = STATUS[cameraStatus]
  return (
    <header className="flex shrink-0 items-center justify-between gap-3 px-3 py-2.5 pt-[max(0.625rem,env(safe-area-inset-top))] lg:px-4">
      <div className="flex min-w-0 items-center gap-2.5">
        <div className="btn-primary grid size-9 shrink-0 place-items-center rounded-xl">
          <Brush className="size-5 text-white" strokeWidth={2.4} />
        </div>
        <div className="min-w-0 leading-tight">
          <h1 className="text-gradient truncate text-lg font-extrabold tracking-tight">Virtual Pincel</h1>
          <p className="hidden text-xs text-slate-400 sm:block">Dibuja en el aire con tu mano</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="glass flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-slate-200" role="status">
          <span className={`size-2 rounded-full ${status.dot}`} />
          <span className="hidden sm:inline">{status.label}</span>
          {cameraStatus === 'active' && fps > 0 && <span className="whitespace-nowrap tabular-nums text-slate-400">{fps} fps</span>}
        </div>
        {children}
        <button type="button" className="icon-btn size-10" onClick={onOpenSettings} aria-label="Ajustes y ayuda" title="Ajustes y ayuda">
          <Settings2 className="size-5" />
        </button>
      </div>
    </header>
  )
}

export const Header = memo(HeaderBase)
