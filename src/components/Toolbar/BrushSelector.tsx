import { memo } from 'react'
import { BRUSHES } from '../../utils/drawingUtils'

interface Props {
  value: number
  color: string
  onChange: (size: number) => void
  gestureTargets?: boolean
  size?: 'md' | 'lg'
}

function BrushSelectorBase({ value, color, onChange, gestureTargets, size = 'md' }: Props) {
  const dim = size === 'lg' ? 'size-10 sm:size-11' : 'size-10'
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Tamaño del pincel">
      {BRUSHES.map((b) => (
        <button
          key={b.size}
          type="button"
          role="radio"
          aria-checked={b.size === value}
          aria-label={`${b.name} (${b.size} px)`}
          title={`${b.name} · ${b.size} px`}
          data-active={b.size === value}
          data-gesture-target={gestureTargets ? '' : undefined}
          onClick={() => onChange(b.size)}
          className={`icon-btn ${dim}`}
        >
          <span
            className="rounded-full ring-1 ring-white/40 transition-all duration-200"
            style={{ width: b.size + 2, height: b.size + 2, background: color }}
          />
        </button>
      ))}
    </div>
  )
}

export const BrushSelector = memo(BrushSelectorBase)
