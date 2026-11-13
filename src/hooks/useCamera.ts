import { useCallback, useEffect, useRef, useState } from 'react'
import { CameraError, openCamera, stopStream, streamFacingMode } from '../services/cameraService'
import type { CameraStatus, FacingMode } from '../types'

/** Administra el ciclo de vida de la cámara: permisos, encendido, apagado y cambio de lente. */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const requestId = useRef(0)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [status, setStatus] = useState<CameraStatus>('idle')
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<FacingMode>('user')

  const release = useCallback(() => {
    stopStream(streamRef.current)
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
  }, [])

  const start = useCallback(
    async (facing: FacingMode = 'user') => {
      const id = ++requestId.current
      release()
      setStream(null)
      setStatus('requesting')
      setError(null)
      try {
        const media = await openCamera(facing)
        if (id !== requestId.current) {
          stopStream(media) // se canceló mientras se pedía permiso
          return
        }
        streamRef.current = media
        setFacingMode(streamFacingMode(media, facing))
        setStream(media)
        // Si el sistema corta la cámara (p. ej. se desconecta), se refleja en la interfaz.
        media.getVideoTracks()[0]?.addEventListener('ended', () => {
          if (streamRef.current === media) {
            release()
            setStream(null)
            setStatus('idle')
          }
        })
        const video = videoRef.current
        if (video) {
          video.srcObject = media
          await video.play().catch(() => undefined)
        }
        if (id === requestId.current) setStatus('active')
      } catch (err) {
        if (id !== requestId.current) return
        setError(err instanceof CameraError ? err.message : 'No se pudo iniciar la cámara.')
        setStatus('error')
      }
    },
    [release],
  )

  const stop = useCallback(() => {
    requestId.current++
    release()
    setStream(null)
    setStatus('idle')
    setError(null)
  }, [release])

  const switchCamera = useCallback(() => {
    void start(facingMode === 'user' ? 'environment' : 'user')
  }, [facingMode, start])

  // Al cerrar o desmontar la app se detienen las pistas de vídeo.
  useEffect(() => {
    const onHide = () => stopStream(streamRef.current)
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      requestId.current++
      release()
    }
  }, [release])

  return { videoRef, stream, status, error, facingMode, mirrored: facingMode === 'user', start, stop, switchCamera }
}
