import { Camera, CameraOff, SwitchCamera } from 'lucide-react'
import { memo } from 'react'
import type { CameraStatus } from '../../types'

interface Props {
  status: CameraStatus
  onToggle: () => void
  onSwitch: () => void
  compact?: boolean
}

function CameraControlsBase({ status, onToggle, onSwitch, compact }: Props) {
  const on = status === 'active' || status === 'requesting'
  const Icon = on ? CameraOff : Camera
  const label = on ? 'Desactivar cámara' : 'Activar cámara'

  if (compact) {
    return (
      <div className="flex gap-2">
        {status === 'active' && (
          <button type="button" className="icon-btn size-10" onClick={onSwitch} aria-label="Cambiar de cámara" title="Cambiar de cámara">
            <SwitchCamera className="size-5" />
          </button>
        )}
        <button type="button" className="icon-btn size-10" data-active={on} onClick={onToggle} aria-label={label} title={label}>
          <Icon className="size-5" />
        </button>
      </div>
    )
  }

  return (
    <div className="flex gap-2">
      <button
        type="button"
        onClick={onToggle}
        className={`flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm font-semibold text-white ${on ? 'icon-btn' : 'btn-primary'}`}
      >
        <Icon className="size-[18px]" />
        {label}
      </button>
      <button type="button" className="icon-btn size-11" onClick={onSwitch} disabled={status !== 'active'} aria-label="Cambiar de cámara" title="Cambiar de cámara">
        <SwitchCamera className="size-5" />
      </button>
    </div>
  )
}

export const CameraControls = memo(CameraControlsBase)
