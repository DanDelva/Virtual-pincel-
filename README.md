# Virtual Pincel 🎨✋

Aplicación web para **dibujar en el aire** con los gestos de la mano. La cámara detecta tu mano en tiempo real (MediaPipe Hand Landmarker), interpreta los gestos y los convierte en trazos sobre un lienzo digital. Todo el procesamiento ocurre en el navegador: el vídeo **no se graba ni se envía** a ningún servidor.

## Gestos

| Gesto | Acción |
| --- | --- |
| ☝️ Índice levantado | Modo dibujo: mueve el cursor por el lienzo |
| 🤏 Índice y pulgar juntos (pinza) | Traza mientras se mantiene la pinza |
| ✋ Mano abierta | Pausa el dibujo y abre el menú de herramientas |
| ✌️ Índice y medio levantados | Selección: mantén el cursor ~0,75 s sobre un color o herramienta |
| ✊ Puño cerrado | Borrador |

En **Ajustes** puedes cambiar al modo «Solo índice» (el índice pinta directamente), ajustar el **umbral de la pinza**, la **sensibilidad**, el **suavizado**, los **fotogramas de estabilidad** y el fondo del lienzo (oscuro, claro o la propia cámara). También se puede dibujar con el dedo o el ratón.

## Funcionalidades

- Cámara en tiempo real con los 21 puntos de la mano superpuestos; encender/apagar y cambiar entre cámara frontal y trasera.
- 8 colores (negro, blanco, rojo, azul, verde, amarillo, morado, naranja) y 3 grosores (3, 8 y 16 px).
- Borrador, deshacer (también deshace «limpiar»), limpiar lienzo y descarga en PNG.
- Trazos suaves: filtro One Euro sobre el cursor + interpolación con curvas cuadráticas.
- Gestos estables: histéresis en la pinza y confirmación tras varios fotogramas consecutivos.
- Interfaz responsiva (móvil, tableta y escritorio) con mensajes claros para permisos denegados, cámara no disponible o fallo al cargar el modelo.

## Requisitos

- Node.js 20 o superior.
- Navegador moderno: Chrome, Edge, Safari o Firefox recientes.
- **Contexto seguro**: la cámara solo funciona en `https://` o en `http://localhost`.

## Instalación y ejecución

```bash
npm install
npm run dev        # servidor de desarrollo en http://localhost:5173
```

Otros comandos:

```bash
npm run build      # comprobación de tipos + build de producción en dist/
npm run preview    # sirve el build en http://localhost:4173
npm test           # pruebas unitarias (gestos, coordenadas, suavizado)
```

`npm run dev` y `npm run build` ejecutan antes `scripts/setup-assets.mjs`, que copia el runtime WASM de MediaPipe a `public/wasm` y descarga el modelo si faltara. Si los recursos locales no están disponibles, la app recurre automáticamente al CDN.

### Probarla desde el teléfono

El teléfono necesita HTTPS para acceder a la cámara (una IP local como `http://192.168.x.x` no sirve). Opciones:

1. **GitHub Pages** (incluido): fusiona en `main`, activa *Settings → Pages → Source: GitHub Actions* y el flujo `.github/workflows/deploy.yml` publicará la app en una URL HTTPS.
2. Cualquier hosting estático (Vercel, Netlify, Cloudflare Pages…) sirviendo la carpeta `dist/`.
3. Un túnel HTTPS hacia tu servidor local (por ejemplo `cloudflared` o `ngrok`).

## Arquitectura

```
src/
├── components/
│   ├── Camera/    CameraView (vídeo + puntos de la mano), CameraControls
│   ├── Canvas/    DrawingCanvas, CanvasControls, GestureMenu, StartOverlay
│   ├── Toolbar/   ColorPalette, BrushSelector
│   └── UI/        Header, GestureStatus, GestureGuide, SettingsPanel
├── hooks/
│   ├── useCamera.ts             permisos y ciclo de vida de la cámara
│   ├── useHandTracking.ts       bucle requestAnimationFrame + MediaPipe
│   ├── useDrawing.ts            motor de dibujo vectorial sobre Canvas 2D
│   └── useGestureController.ts  gesto → cursor / trazo / borrado / selección
├── services/
│   ├── cameraService.ts         getUserMedia y errores
│   ├── handDetection.ts         Hand Landmarker (GPU con respaldo a CPU)
│   └── gestureRecognition.ts    clasificación + estabilización de gestos
├── utils/
│   ├── gestureUtils.ts          reglas geométricas y estabilizador
│   ├── coordinates.ts           mapeo cámara → lienzo y filtro One Euro
│   └── drawingUtils.ts          trazos, esqueleto de la mano, exportación PNG
└── types/
```

**Rendimiento.** El seguimiento y el dibujo trabajan con *refs* fuera del ciclo de render de React: React solo se actualiza cuando cambia el gesto, la presencia de la mano o el contador de FPS (una vez por segundo). Solo se analiza cada fotograma nuevo del vídeo y cada punto dibuja únicamente el último tramo del trazo. Los trazos se guardan como vectores normalizados, así que sobreviven a cambios de tamaño y de orientación.

**Privacidad.** Se pide permiso solo al pulsar «Activar cámara»; las pistas de vídeo se detienen al desactivarla o cerrar la página, y el modelo y el runtime se sirven desde la propia app.

## Consejos de uso

- Buena iluminación frontal y un fondo sin mucho ruido mejoran la detección.
- Mantén la mano a 40–70 cm de la cámara, con la palma hacia ella.
- Si la pinza no se detecta, sube el umbral; si pinta sin querer, bájalo.
- Si el trazo tiembla, sube el suavizado; si notas retardo, bájalo.

## Estado de las pruebas

Verificado de forma automática en Chromium (móvil y escritorio emulados) con una cámara simulada: arranque de cámara, carga del modelo, detección de mano, reconocimiento de índice / selección / puño / mano abierta sobre fotos reales, dibujo, borrador, deshacer, limpiar, descarga PNG y liberación de la cámara. Queda pendiente la prueba manual con cámara real en distintos dispositivos, navegadores (Safari, Firefox) y condiciones de luz, incluido el ajuste fino del umbral de la pinza.
