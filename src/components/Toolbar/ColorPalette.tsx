import { Check } from 'lucide-react'
import { memo } from 'react'
import { COLORS } from '../../utils/drawingUtils'

interface Props {
  value: string
  onChange: (color: string) => void
  /** Marca los botones como seleccionables con el cursor de gestos. */
  gestureTargets?: boolean
  size?: 'md' | 'lg'
}

const isLight = (hex: string) => {
  const n = parseInt(hex.slice(1), 16)
  return ((n >> 16) & 255) * 0.299 + ((n >> 8) & 255) * 0.587 + (n & 255) * 0.114 > 160
}

function ColorPaletteBase({ value, onChange, gestureTargets, size = 'md' }: Props) {
  const dim = size === 'lg' ? 'size-9 sm:size-11' : 'size-8 sm:size-9'
  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2" role="radiogroup" aria-label="Color del pincel">
      {COLORS.map((c) => {
        const selected = c.value === value
        return (
          <button
            key={c.value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={c.name}
            title={c.name}
            data-gesture-target={gestureTargets ? '' : undefined}
            onClick={() => onChange(c.value)}
            className={`${dim} grid shrink-0 place-items-center rounded-full border-2 transition-all duration-200 active:scale-90 ${
              selected ? 'scale-110 border-white shadow-[0_0_0_3px_rgba(167,139,250,0.55)]' : 'border-white/25 hover:scale-105'
            }`}
            style={{ background: c.value }}
          >
            {selected && <Check className={`size-4 ${isLight(c.value) ? 'text-slate-900' : 'text-white'}`} strokeWidth={3.5} />}
          </button>
        )
      })}
    </div>
  )
}

export const ColorPalette = memo(ColorPaletteBase)
