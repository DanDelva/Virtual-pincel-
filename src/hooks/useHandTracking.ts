import { useEffect, useRef, useState, type RefObject } from 'react'
import { GestureRecognizer } from '../services/gestureRecognition'
import { HandDetector } from '../services/handDetection'
import type { Gesture, HandFrame, Settings, TrackerStatus } from '../types'

interface Options {
  videoRef: RefObject<HTMLVideoElement | null>
  active: boolean
  settingsRef: RefObject<Settings>
  /** Se llama en cada fotograma analizado (fuera del ciclo de render de React). */
  onFrame: (frame: HandFrame | null) => void
}

/**
 * Bucle de seguimiento: analiza cada fotograma nuevo del vídeo con MediaPipe y
 * entrega el resultado por callback. El estado de React solo cambia cuando cambia
 * el gesto o la presencia de la mano, para no provocar renderizados por fotograma.
 */
export function useHandTracking({ videoRef, active, settingsRef, onFrame }: Options) {
  const [status, setStatus] = useState<TrackerStatus>('idle')
  const [gesture, setGesture] = useState<Gesture>('none')
  const [handDetected, setHandDetected] = useState(false)
  const [fps, setFps] = useState(0)
  const detectorRef = useRef<HandDetector | null>(null)
  const onFrameRef = useRef(onFrame)
  onFrameRef.current = onFrame

  useEffect(() => {
    if (!active) return
    let cancelled = false
    let raf = 0
    let lastVideoTime = -1
    let frames = 0
    let fpsWindowStart = performance.now()
    let lastGesture: Gesture = 'none'
    let lastDetected = false
    // Tolerancia a pérdidas breves de la mano (1–2 fotogramas) sin cortar el trazo.
    let missed = 0
    const recognizer = new GestureRecognizer()

    const publish = (detected: boolean, g: Gesture) => {
      if (detected !== lastDetected) {
        lastDetected = detected
        setHandDetected(detected)
      }
      if (g !== lastGesture) {
        lastGesture = g
        setGesture(g)
      }
    }

    const loop = () => {
      if (cancelled) return
      raf = requestAnimationFrame(loop)
      const video = videoRef.current
      const detector = detectorRef.current
      if (!video || !detector || video.readyState < 2 || video.videoWidth === 0) return
      if (video.currentTime === lastVideoTime) return // sin fotograma nuevo
      lastVideoTime = video.currentTime

      const now = performance.now()
      let landmarks = null
      try {
        landmarks = detector.detect(video, now)
      } catch (err) {
        console.error('[tracking] Error de detección', err)
        cancelled = true
        setStatus('error')
        onFrameRef.current(null)
        return
      }

      frames += 1
      if (now - fpsWindowStart >= 1000) {
        setFps(Math.round((frames * 1000) / (now - fpsWindowStart)))
        frames = 0
        fpsWindowStart = now
      }

      if (!landmarks) {
        missed += 1
        if (missed > 3) {
          recognizer.reset()
          publish(false, 'none')
          onFrameRef.current(null)
        }
        return
      }
      missed = 0
      const videoAspect = video.videoWidth / video.videoHeight
      const result = recognizer.recognize(landmarks, videoAspect, settingsRef.current)
      publish(true, result.gesture)
      onFrameRef.current({ landmarks, ...result, videoAspect, time: now })
    }

    const begin = async () => {
      try {
        if (!detectorRef.current) {
          setStatus('loading')
          const detector = await HandDetector.load()
          if (cancelled) {
            detector.close()
            return
          }
          detectorRef.current = detector
        }
        setStatus('ready')
        raf = requestAnimationFrame(loop)
      } catch (err) {
        console.error('[tracking] No se pudo cargar MediaPipe', err)
        if (!cancelled) setStatus('error')
      }
    }
    void begin()

    return () => {
      cancelled = true
      cancelAnimationFrame(raf)
      setHandDetected(false)
      setGesture('none')
      setFps(0)
      onFrameRef.current(null)
    }
  }, [active, videoRef, settingsRef])

  // Libera el modelo al desmontar.
  useEffect(
    () => () => {
      detectorRef.current?.close()
      detectorRef.current = null
    },
    [],
  )

  return { status, gesture, handDetected, fps }
}
