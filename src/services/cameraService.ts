import type { FacingMode } from '../types'

export type CameraErrorCode = 'insecure' | 'unsupported' | 'denied' | 'notfound' | 'inuse' | 'unknown'

const MESSAGES: Record<CameraErrorCode, string> = {
  insecure: 'La cámara solo funciona en un contexto seguro: abre la app por HTTPS o desde localhost.',
  unsupported: 'Este navegador no permite acceder a la cámara. Prueba con Chrome, Edge o Safari actualizados.',
  denied: 'Permiso de cámara denegado. Actívalo en los ajustes del sitio (icono del candado) y vuelve a intentarlo.',
  notfound: 'No se encontró ninguna cámara disponible en este dispositivo.',
  inuse: 'La cámara está siendo usada por otra aplicación. Ciérrala e inténtalo de nuevo.',
  unknown: 'No se pudo iniciar la cámara. Inténtalo de nuevo.',
}

export class CameraError extends Error {
  code: CameraErrorCode
  constructor(code: CameraErrorCode) {
    super(MESSAGES[code])
    this.name = 'CameraError'
    this.code = code
  }
}

function toCameraError(err: unknown): CameraError {
  const name = err instanceof DOMException || err instanceof Error ? err.name : ''
  switch (name) {
    case 'NotAllowedError':
    case 'SecurityError':
      return new CameraError('denied')
    case 'NotFoundError':
    case 'DevicesNotFoundError':
    case 'OverconstrainedError':
      return new CameraError('notfound')
    case 'NotReadableError':
    case 'TrackStartError':
    case 'AbortError':
      return new CameraError('inuse')
    default:
      return new CameraError('unknown')
  }
}

/** Solicita permiso y abre la cámara. El vídeo nunca sale del navegador. */
export async function openCamera(facingMode: FacingMode): Promise<MediaStream> {
  if (!window.isSecureContext) throw new CameraError('insecure')
  if (!navigator.mediaDevices?.getUserMedia) throw new CameraError('unsupported')
  const video = { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30 } }
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: false, video: { ...video, facingMode } })
  } catch (err) {
    // Algunos equipos no admiten la restricción facingMode: se reintenta sin ella.
    if (err instanceof DOMException && err.name === 'OverconstrainedError') {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: false, video })
      } catch (retryErr) {
        throw toCameraError(retryErr)
      }
    }
    throw toCameraError(err)
  }
}

export function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((track) => track.stop())
}

/** Cámara trasera detectada → no se aplica el efecto espejo. */
export function streamFacingMode(stream: MediaStream, requested: FacingMode): FacingMode {
  const reported = stream.getVideoTracks()[0]?.getSettings().facingMode
  if (reported === 'environment' || reported === 'user') return reported
  return requested === 'environment' && reported === undefined ? 'user' : requested
}
