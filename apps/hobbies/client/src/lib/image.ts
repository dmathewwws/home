/**
 * Client-side photo processing: downscale + JPEG re-encode (full 2048px /
 * thumb 640px edges). The canvas re-encode strips EXIF/GPS as a side effect.
 * Pattern from the dweb-camp-cascadia photos app.
 */

const FULL_EDGE = 2048
const THUMB_EDGE = 640
const FULL_QUALITY = 0.82
const THUMB_QUALITY = 0.7

async function decodeImage(file: File): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Some browsers can't createImageBitmap certain formats (e.g. HEIC edge
    // cases) — fall back to an <img> decode.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

function drawScaled(source: ImageBitmap | HTMLImageElement | HTMLCanvasElement, maxEdge: number): HTMLCanvasElement {
  const width = 'naturalWidth' in source ? source.naturalWidth : source.width
  const height = 'naturalHeight' in source ? source.naturalHeight : source.height
  const scale = Math.min(1, maxEdge / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))
  const ctx = canvas.getContext('2d')!
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height)
  return canvas
}

function toJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error('Could not encode photo'))), 'image/jpeg', quality)
  })
}

export interface ProcessedPhoto {
  full: Blob
  thumb: Blob
}

export async function processPhoto(file: File): Promise<ProcessedPhoto> {
  const source = await decodeImage(file)
  const fullCanvas = drawScaled(source, FULL_EDGE)
  const thumbCanvas = drawScaled(fullCanvas, THUMB_EDGE)
  const [full, thumb] = await Promise.all([toJpegBlob(fullCanvas, FULL_QUALITY), toJpegBlob(thumbCanvas, THUMB_QUALITY)])
  if ('close' in source) source.close()
  return { full, thumb }
}

/** PUT a blob with upload progress (XHR — fetch has no upload progress). */
export function putWithProgress(
  url: string,
  blob: Blob,
  onProgress?: (fraction: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', url)
    xhr.setRequestHeader('Content-Type', 'image/jpeg')
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(e.loaded / e.total)
    }
    xhr.onload = () =>
      xhr.status >= 200 && xhr.status < 300 ? resolve() : reject(new Error(`Upload failed (${xhr.status})`))
    xhr.onerror = () => reject(new Error('Upload failed'))
    xhr.send(blob)
  })
}
