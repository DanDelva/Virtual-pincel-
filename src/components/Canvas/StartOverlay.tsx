import { Camera, LoaderCircle, ShieldCheck, TriangleAlert } from 'lucide-react'
import { memo } from 'react'
import type { CameraStatus } from '../../types'

interface Props {
  status: CameraStatus
  error: string | null
  onStart: () => void
}

/** Pantalla inicial sobre el lienzo: pide activar la cámara y muestra errores de permisos. */
function StartOverlayBase({ status, error, onStart }: Props) {
  const requesting = status === 'requesting'
  return (
    <div className="pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-y-auto p-4">
      <div className="glass pointer-events-auto flex w-full max-w-sm animate-fade-up flex-col items-center gap-4 rounded-3xl !bg-[#0c0c18]/85 p-6 text-center shadow-2xl">
        <div className="btn-primary grid size-16 animate-float place-items-center rounded-2xl">
          <Camera className="size-8 text-white" />
        </div>
        <div>
          <h2 className="text-xl font-extrabold text-white">Dibuja en el aire</h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-300">
            Activa la cámara y <strong className="text-white">levanta el índice</strong> para pintar. Abre la mano para parar y elegir colores; cierra el puño para borrar.
          </p>
        </div>

        {error && (
          <p className="flex animate-fade-in items-start gap-2 rounded-xl bg-rose-500/15 p-3 text-left text-xs leading-relaxed text-rose-100" role="alert">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={onStart}
          disabled={requesting}
          className="btn-primary flex h-12 w-full items-center justify-center gap-2 rounded-2xl text-base font-bold text-white disabled:opacity-70"
        >
          {requesting ? <LoaderCircle className="size-5 animate-spin" /> : <Camera className="size-5" />}
          {requesting ? 'Esperando permiso…' : error ? 'Reintentar' : 'Activar cámara'}
        </button>

        <p className="flex items-center gap-1.5 text-[11px] text-slate-400">
          <ShieldCheck className="size-3.5 text-emerald-300" />
          El vídeo se procesa en tu dispositivo y nunca se envía.
        </p>
      </div>
    </div>
  )
}

export const StartOverlay = memo(StartOverlayBase)
