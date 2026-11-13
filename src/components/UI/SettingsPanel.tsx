import { RotateCcw, ShieldCheck, X } from 'lucide-react'
import { useEffect, type ReactNode } from 'react'
import type { CanvasBackground, DrawMode, Settings } from '../../types'
import { GestureGuide } from './GestureGuide'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
  onReset: () => void
  onClose: () => void
}

function Slider(props: { label: string; hint: string; value: number; min: number; max: number; step: number; display: string; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="flex items-baseline justify-between gap-2">
        <span className="text-sm font-semibold text-white">{props.label}</span>
        <span className="text-xs font-semibold tabular-nums text-violet-300">{props.display}</span>
      </span>
      <input
        type="range"
        className="mt-2.5"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(Number(e.target.value))}
      />
      <span className="mt-1.5 block text-xs text-slate-400">{props.hint}</span>
    </label>
  )
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-xl bg-white/5 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${value === o.value ? 'bg-white/15 text-white shadow' : 'text-slate-400 hover:text-white'}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-4">
      <h3 className="text-[11px] font-bold tracking-widest text-slate-400 uppercase">{title}</h3>
      {children}
    </section>
  )
}

export function SettingsPanel({ settings, onChange, onReset, onClose }: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-black/60 backdrop-blur-sm sm:items-center sm:p-6" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Ajustes"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[88dvh] w-full animate-sheet flex-col rounded-t-3xl border border-white/10 bg-[#11111d] shadow-2xl sm:max-w-lg sm:rounded-3xl"
      >
        <div className="flex shrink-0 items-center justify-between px-5 pt-4 pb-3">
          <h2 className="text-lg font-bold text-white">Ajustes y ayuda</h2>
          <div className="flex gap-2">
            <button type="button" className="icon-btn size-9" onClick={onReset} aria-label="Restablecer ajustes" title="Restablecer ajustes">
              <RotateCcw className="size-4" />
            </button>
            <button type="button" className="icon-btn size-9" onClick={onClose} aria-label="Cerrar">
              <X className="size-4" />
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-7 overflow-y-auto px-5 pt-2 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <Section title="Dibujo">
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Modo de trazo</p>
              <Segmented<DrawMode>
                value={settings.drawMode}
                onChange={(drawMode) => onChange({ drawMode })}
                options={[
                  { value: 'index', label: 'Índice (recomendado)' },
                  { value: 'pinch', label: 'Solo pinza' },
                ]}
              />
              <p className="mt-1.5 text-xs text-slate-400">
                {settings.drawMode === 'pinch'
                  ? 'El índice mueve el cursor y la pinza índice–pulgar pinta.'
                  : 'El índice levantado pinta directamente (la pinza también). Abre la mano o levanta dos dedos para mover el cursor sin pintar.'}
              </p>
            </div>
            <div>
              <p className="mb-2 text-sm font-semibold text-white">Fondo del lienzo</p>
              <Segmented<CanvasBackground>
                value={settings.background}
                onChange={(background) => onChange({ background })}
                options={[
                  { value: 'dark', label: 'Oscuro' },
                  { value: 'light', label: 'Claro' },
                  { value: 'camera', label: 'Cámara' },
                ]}
              />
              <p className="mt-1.5 text-xs text-slate-400">«Cámara» te muestra detrás del lienzo para dibujar justo donde está tu dedo.</p>
            </div>
          </Section>

          <Section title="Detección">
            <Slider
              label="Umbral de la pinza"
              hint="Distancia entre índice y pulgar para empezar a trazar. Súbelo si le cuesta detectar la pinza."
              min={0.15}
              max={0.6}
              step={0.01}
              value={settings.pinchThreshold}
              display={`${Math.round(settings.pinchThreshold * 100)} %`}
              onChange={(pinchThreshold) => onChange({ pinchThreshold })}
            />
            <Slider
              label="Sensibilidad"
              hint="Con más sensibilidad recorres todo el lienzo moviendo menos la mano."
              min={0}
              max={1}
              step={0.05}
              value={settings.sensitivity}
              display={`${Math.round(settings.sensitivity * 100)} %`}
              onChange={(sensitivity) => onChange({ sensitivity })}
            />
            <Slider
              label="Suavizado del trazo"
              hint="Reduce el temblor de la mano a cambio de un pequeño retardo."
              min={0}
              max={1}
              step={0.05}
              value={settings.smoothing}
              display={`${Math.round(settings.smoothing * 100)} %`}
              onChange={(smoothing) => onChange({ smoothing })}
            />
            <Slider
              label="Estabilidad del gesto"
              hint="Fotogramas consecutivos necesarios para confirmar un gesto y evitar activaciones accidentales."
              min={1}
              max={8}
              step={1}
              value={settings.stabilityFrames}
              display={`${settings.stabilityFrames} fotogramas`}
              onChange={(stabilityFrames) => onChange({ stabilityFrames })}
            />
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Mostrar puntos de la mano</span>
              <input
                type="checkbox"
                className="size-5 accent-violet-500"
                checked={settings.showLandmarks}
                onChange={(e) => onChange({ showLandmarks: e.target.checked })}
              />
            </label>
            <label className="flex items-center justify-between gap-3">
              <span className="text-sm font-semibold text-white">Censurar señas obscenas</span>
              <input
                type="checkbox"
                className="size-5 accent-violet-500"
                checked={settings.censor}
                onChange={(e) => onChange({ censor: e.target.checked })}
              />
            </label>
          </Section>

          <Section title="Gestos">
            <GestureGuide drawMode={settings.drawMode} />
          </Section>

          <p className="flex items-start gap-2.5 rounded-2xl bg-emerald-400/10 p-3 text-xs leading-relaxed text-emerald-100">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-emerald-300" />
            Tu privacidad está protegida: el vídeo se procesa únicamente en este dispositivo. No se graba, no se guarda y nunca se envía a ningún servidor.
          </p>
        </div>
      </div>
    </div>
  )
}
