import { CameraOff, Hand, LoaderCircle } from 'lucide-react'
import { memo, useCallback, useState, type RefObject } from 'react'
import type { CameraStatus, TrackerStatus } from '../../types'

interface Props {
  videoRef: RefObject<HTMLVideoElement | null>
  /** Canvas superpuesto donde se pintan los puntos de la mano. */
  overlayRef: RefObject<HTMLCanvasElement | null>
  status: CameraStatus
  trackerStatus: TrackerStatus
  handDetected: boolean
  mirrored: boolean
}

function CameraViewBase({ videoRef, overlayRef, status, trackerStatus, handDetected, mirrored }: Props) {
  const [aspect, setAspect] = useState(4 / 3)
  const active = status === 'active'

  // El overlay adopta la resolución real del vídeo (cambia al girar el teléfono).
  const syncSize = useCallback(() => {
    const video = videoRef.current
    const overlay = overlayRef.current
    if (!video || !video.videoWidth) return
    setAspect(video.videoWidth / video.videoHeight)
    if (overlay) {
      overlay.width = video.videoWidth
      overlay.height = video.videoHeight
    }
  }, [videoRef, overlayRef])

  const flip = mirrored ? '-scale-x-100' : ''

  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl border border-white/15 bg-black/60 shadow-xl shadow-black/40"
      style={{ aspectRatio: active ? aspect : 4 / 3 }}
    >
      <video
        ref={videoRef}
        className={`absolute inset-0 size-full object-cover transition-opacity duration-300 ${flip} ${active ? 'opacity-100' : 'opacity-0'}`}
        playsInline
        muted
        autoPlay
        onLoadedMetadata={syncSize}
        onResize={syncSize}
      />
      <canvas ref={overlayRef} className={`absolute inset-0 size-full ${flip} ${active ? '' : 'hidden'}`} />

      {!active && (
        <div className="absolute inset-0 grid place-items-center text-slate-500">
          {status === 'requesting' ? <LoaderCircle className="size-8 animate-spin" /> : <CameraOff className="size-8" />}
        </div>
      )}

      {active && trackerStatus === 'loading' && (
        <div className="absolute inset-0 grid place-items-center bg-black/50">
          <LoaderCircle className="size-6 animate-spin text-white" />
        </div>
      )}

      {active && trackerStatus === 'ready' && !handDetected && (
        <div className="absolute inset-x-0 bottom-0 flex animate-fade-in items-center justify-center gap-1.5 bg-gradient-to-t from-black/80 to-transparent px-1 pt-5 pb-1.5 text-[10px] font-semibold text-amber-200 lg:text-xs">
          <Hand className="size-3 shrink-0 lg:size-3.5" />
          <span className="truncate">Sin mano</span>
        </div>
      )}
    </div>
  )
}

export const CameraView = memo(CameraViewBase)
