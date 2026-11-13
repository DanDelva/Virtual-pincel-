import { LoaderCircle, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraControls } from './components/Camera/CameraControls'
import { CameraView } from './components/Camera/CameraView'
import { CanvasControls } from './components/Canvas/CanvasControls'
import { DrawingCanvas } from './components/Canvas/DrawingCanvas'
import { GestureMenu } from './components/Canvas/GestureMenu'
import { StartOverlay } from './components/Canvas/StartOverlay'
import { BrushSelector } from './components/Toolbar/BrushSelector'
import { ColorPalette } from './components/Toolbar/ColorPalette'
import { GestureGuide } from './components/UI/GestureGuide'
import { GestureStatus } from './components/UI/GestureStatus'
import { Header } from './components/UI/Header'
import { SettingsPanel } from './components/UI/SettingsPanel'
import { useCamera } from './hooks/useCamera'
import { useDrawing } from './hooks/useDrawing'
import { useGestureController, type LiveState } from './hooks/useGestureController'
import { useHandTracking } from './hooks/useHandTracking'
import type { Gesture, Settings, Tool } from './types'
import { BACKGROUND_COLORS, BRUSHES, COLORS } from './utils/drawingUtils'

/** En pantallas pequeñas (teléfono) lo más cómodo es verse detrás del lienzo y dibujar donde está el dedo. */
const isSmallScreen = () => typeof window !== 'undefined' && Math.min(window.innerWidth, window.innerHeight) < 600

const DEFAULT_SETTINGS: Settings = {
  pinchThreshold: 0.3,
  sensitivity: 0.5,
  smoothing: 0.5,
  stabilityFrames: 3,
  drawMode: 'index',
  showLandmarks: true,
  censor: true,
  background: 'light',
}
const REACTIONS: Partial<Record<Gesture, string>> = { like: '👍', dislike: '👎', heart: '❤️' }
const STORAGE_KEY = 'virtual-pincel:settings:v4'

function loadSettings(): Settings {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}')
    return { ...DEFAULT_SETTINGS, ...(isSmallScreen() ? { background: 'camera' } : null), ...saved }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export default function App() {
  const [settings, setSettings] = useState(loadSettings)
  // Violeta sobre fondo oscuro: visible desde el primer trazo.
  const [color, setColor] = useState(COLORS[6].value)
  const [size, setSize] = useState(BRUSHES[1].size)
  const [tool, setTool] = useState<Tool>('brush')
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  const camera = useCamera()
  const drawing = useDrawing()
  const stageRef = useRef<HTMLDivElement>(null)
  const cursorRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLCanvasElement>(null)
  const censorRef = useRef<HTMLDivElement>(null)

  // Valores "en vivo" para el bucle de seguimiento, que corre fuera de React.
  const settingsRef = useRef(settings)
  settingsRef.current = settings
  const liveRef = useRef<LiveState>({ settings, color, size, tool, mirrored: camera.mirrored })
  liveRef.current = { settings, color, size, tool, mirrored: camera.mirrored }

  const onFrame = useGestureController({ liveRef, drawing, stageRef, cursorRef, overlayRef, censorRef })
  const cameraActive = camera.status === 'active'
  const tracking = useHandTracking({ videoRef: camera.videoRef, active: cameraActive, settingsRef, onFrame })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* almacenamiento no disponible */
    }
  }, [settings])

  // Con la cámara activa se evita que la pantalla del teléfono se apague mientras se dibuja sin tocarla.
  useEffect(() => {
    if (!cameraActive || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | null = null
    let released = false
    const acquire = () => {
      if (document.visibilityState !== 'visible') return
      navigator.wakeLock.request('screen').then(
        (l) => (released ? void l.release() : (lock = l)),
        () => undefined,
      )
    }
    acquire()
    document.addEventListener('visibilitychange', acquire)
    return () => {
      released = true
      document.removeEventListener('visibilitychange', acquire)
      void lock?.release().catch(() => undefined)
    }
  }, [cameraActive])

  // El menú de gestos se mantiene un instante tras cambiar de gesto para que no parpadee.
  const selecting = tracking.gesture === 'open' || tracking.gesture === 'select'
  useEffect(() => {
    if (selecting) {
      setMenuOpen(true)
      return
    }
    const timer = setTimeout(() => setMenuOpen(false), 900)
    return () => clearTimeout(timer)
  }, [selecting])

  // Reacciones: al reconocer me gusta / no me gusta / corazón se lanzan emojis sobre el lienzo.
  const [reaction, setReaction] = useState<{ emoji: string; id: number } | null>(null)
  useEffect(() => {
    const emoji = REACTIONS[tracking.gesture]
    if (!emoji) return
    setReaction({ emoji, id: Date.now() })
    const timer = setTimeout(() => setReaction(null), 1800)
    return () => clearTimeout(timer)
  }, [tracking.gesture])

  const updateSettings = useCallback((patch: Partial<Settings>) => setSettings((s) => ({ ...s, ...patch })), [])
  const resetSettings = useCallback(() => setSettings(DEFAULT_SETTINGS), [])
  const openSettings = useCallback(() => setSettingsOpen(true), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const pickColor = useCallback((value: string) => {
    setColor(value)
    setTool('brush')
  }, [])
  const pickSize = useCallback((value: number) => setSize(value), [])

  const { start, stop, switchCamera, status: cameraStatus } = camera
  const toggleCamera = useCallback(() => {
    if (cameraStatus === 'active' || cameraStatus === 'requesting') stop()
    else void start()
  }, [cameraStatus, start, stop])
  const startCamera = useCallback(() => void start(), [start])

  const { undo, redo, clear, download } = drawing
  const background = settings.background
  const handleDownload = useCallback(() => download(BACKGROUND_COLORS[background]), [download, background])

  const lightStage = background === 'light'

  return (
    <div className="flex h-dvh flex-col overflow-hidden">
      <Header cameraStatus={cameraStatus} fps={tracking.fps} onOpenSettings={openSettings}>
        <div className="lg:hidden">
          <CameraControls status={cameraStatus} onToggle={toggleCamera} onSwitch={switchCamera} compact />
        </div>
      </Header>

      <main className="relative flex min-h-0 flex-1 flex-col gap-3 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] lg:flex-row lg:gap-4 lg:px-4 lg:pb-4">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col gap-3 short:flex-row">
          <DrawingCanvas
            drawing={drawing}
            stageRef={stageRef}
            cursorRef={cursorRef}
            censorRef={censorRef}
            background={background}
            stream={camera.stream}
            mirrored={camera.mirrored}
            color={color}
            size={size}
            tool={tool}
          >
            {!cameraActive && <StartOverlay status={cameraStatus} error={camera.error} onStart={startCamera} />}

            {cameraActive && (
              <div className="pointer-events-none absolute top-2.5 left-2.5 z-10 lg:hidden">
                <GestureStatus variant="chip" gesture={tracking.gesture} handDetected={tracking.handDetected} cameraActive drawMode={settings.drawMode} />
              </div>
            )}

            {cameraActive && tracking.status === 'loading' && (
              <div className="pointer-events-none absolute inset-0 z-10 grid place-items-center">
                <div className="glass flex animate-fade-up items-center gap-2.5 rounded-full !bg-[#0c0c18]/85 px-4 py-2.5 text-sm font-semibold text-white">
                  <LoaderCircle className="size-4 animate-spin text-violet-300" />
                  Cargando el modelo de manos…
                </div>
              </div>
            )}

            {cameraActive && tracking.status === 'error' && (
              <div className="absolute inset-x-3 top-14 z-10 mx-auto flex max-w-md animate-fade-up items-start gap-2.5 rounded-2xl bg-rose-950/90 p-3.5 text-sm text-rose-100 ring-1 ring-rose-400/40" role="alert">
                <TriangleAlert className="mt-0.5 size-4 shrink-0 text-rose-300" />
                <span>
                  No se pudo cargar el modelo de detección de manos. Revisa tu conexión y{' '}
                  <button type="button" className="font-bold underline" onClick={() => window.location.reload()}>
                    recarga la página
                  </button>
                  . Mientras tanto puedes dibujar con el dedo o el ratón.
                </span>
              </div>
            )}

            {cameraActive && tracking.status === 'ready' && !tracking.handDetected && (
              <div className="pointer-events-none absolute inset-x-0 bottom-4 z-10 flex justify-center">
                <p className={`animate-fade-up rounded-full px-4 py-2 text-sm font-semibold ${lightStage ? 'bg-slate-900/80 text-white' : 'bg-white/10 text-slate-200'} backdrop-blur`}>
                  ✋ Muestra tu mano a la cámara
                </p>
              </div>
            )}

            {reaction && (
              <div key={reaction.id} className="pointer-events-none absolute inset-0 z-20 overflow-hidden" aria-hidden>
                {[12, 30, 46, 63, 80].map((left, i) => (
                  <span
                    key={left}
                    className="reaction-emoji"
                    style={{ left: `${left}%`, animationDelay: `${i * 90}ms`, ['--tilt' as string]: `${i % 2 ? 14 : -14}deg` }}
                  >
                    {reaction.emoji}
                  </span>
                ))}
              </div>
            )}

            {cameraActive && tracking.gesture === 'obscene' && settings.censor && (
              <div className="pointer-events-none absolute inset-x-0 top-16 z-20 flex justify-center">
                <p className="animate-fade-up rounded-full bg-rose-600 px-4 py-2 text-sm font-bold text-white shadow-lg">🚫 Seña censurada</p>
              </div>
            )}

            <GestureMenu
              visible={cameraActive && menuOpen}
              color={color}
              size={size}
              tool={tool}
              canUndo={drawing.canUndo}
              canRedo={drawing.canRedo}
              isEmpty={drawing.isEmpty}
              onColor={pickColor}
              onSize={pickSize}
              onTool={setTool}
              onUndo={undo}
              onRedo={redo}
              onClear={clear}
            />
          </DrawingCanvas>

          <div className="glass flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-2.5 rounded-3xl px-3 py-2.5 short:w-40 short:flex-col short:flex-nowrap short:justify-start short:overflow-y-auto short:px-1.5 lg:justify-between lg:px-4">
            <ColorPalette value={color} onChange={pickColor} />
            <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-2.5 short:flex-col sm:gap-x-3">
              <BrushSelector value={size} color={color} onChange={pickSize} />
              <CanvasControls
                tool={tool}
                canUndo={drawing.canUndo}
                canRedo={drawing.canRedo}
                isEmpty={drawing.isEmpty}
                onToolChange={setTool}
                onUndo={undo}
                onRedo={redo}
                onClear={clear}
                onDownload={handleDownload}
              />
            </div>
          </div>
        </section>

        {/* Móvil: la cámara flota sobre el lienzo. Escritorio: panel lateral con ayuda. */}
        <aside
          className={`absolute top-2.5 right-5 z-10 w-24 short:top-auto short:right-auto short:bottom-5 short:left-5 short:w-28 sm:w-36 lg:static lg:flex lg:w-80 lg:shrink-0 lg:flex-col lg:gap-3 lg:overflow-y-auto ${
            cameraActive ? '' : 'max-lg:hidden'
          }`}
        >
          <CameraView
            videoRef={camera.videoRef}
            overlayRef={overlayRef}
            status={cameraStatus}
            trackerStatus={tracking.status}
            handDetected={tracking.handDetected}
            mirrored={camera.mirrored}
          />
          <div className="hidden flex-col gap-3 lg:flex">
            <CameraControls status={cameraStatus} onToggle={toggleCamera} onSwitch={switchCamera} />
            <GestureStatus gesture={tracking.gesture} handDetected={tracking.handDetected} cameraActive={cameraActive} drawMode={settings.drawMode} />
            <div className="glass rounded-2xl p-2">
              <GestureGuide active={tracking.handDetected ? tracking.gesture : undefined} drawMode={settings.drawMode} />
            </div>
          </div>
        </aside>
      </main>

      {settingsOpen && <SettingsPanel settings={settings} onChange={updateSettings} onReset={resetSettings} onClose={closeSettings} />}
    </div>
  )
}
