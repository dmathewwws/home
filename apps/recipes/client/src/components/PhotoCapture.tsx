/**
 * Reflection photo capture: dashed 4:3 area → file picker (camera or
 * library) → client-side downscale → direct PUT to R2 via presigned URLs
 * (worker fallback in dev) → hands the parent a confirmed photoId.
 */

import { useRef, useState } from 'react'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { processPhoto, putWithProgress } from '../lib/image'

interface PhotoCaptureProps {
  photoId: string | null
  onChange: (photoId: string | null) => void
}

export function PhotoCapture({ photoId, onChange }: PhotoCaptureProps) {
  const { getProfileJwt } = useLocalFirstAuth()
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setProgress(0)
    try {
      // Process locally and mint upload slots concurrently
      const [processed, slots] = await Promise.all([processPhoto(file), api.requestUpload(getProfileJwt)])
      const weights = { full: processed.full.size, thumb: processed.thumb.size }
      const total = weights.full + weights.thumb
      let fullDone = 0
      let thumbDone = 0
      const update = () => setProgress((fullDone * weights.full + thumbDone * weights.thumb) / total)
      await Promise.all([
        putWithProgress(slots.fullUrl, processed.full, (f) => {
          fullDone = f
          update()
        }),
        putWithProgress(slots.thumbUrl, processed.thumb, (f) => {
          thumbDone = f
          update()
        }),
      ])
      setPreviewUrl(URL.createObjectURL(processed.thumb))
      setProgress(null)
      onChange(slots.photoId)
    } catch (err) {
      setProgress(null)
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    }
  }

  const clear = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreviewUrl(null)
    onChange(null)
  }

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFile(file)
          e.target.value = ''
        }}
      />
      {photoId && previewUrl ? (
        <div className="relative aspect-[4/3] border border-rule overflow-hidden">
          <img src={previewUrl} alt="Your cook" className="block w-full h-full object-cover" />
          <button
            type="button"
            onClick={clear}
            className="absolute top-2 right-2 font-mono2 text-[10px] tracking-[0.12em] uppercase bg-kraft border border-ink px-2 py-1"
          >
            Retake
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={progress !== null}
          className="bigfield w-full aspect-[4/3] grid place-items-center"
        >
          <span className="grid place-items-center text-center p-2.5">
            <span className="w-[46px] h-[46px] text-muted" aria-hidden>
              <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" className="block w-full h-full">
                <path d="M5 15h8l3-5h16l3 5h8v23H5z" />
                <circle cx="24" cy="26" r="8" />
              </svg>
            </span>
            <span className="font-mono2 text-[10.5px] tracking-[0.14em] uppercase text-muted mt-2.5">
              {progress !== null ? `Uploading · ${Math.round(progress * 100)}%` : 'Take a photo · or pick one'}
            </span>
            {progress !== null && (
              <span className="block w-40 h-[7px] bg-kraft-deep mt-2.5 relative overflow-hidden">
                <span className="absolute inset-y-0 left-0 stripe-bar" style={{ width: `${Math.round(progress * 100)}%` }} />
              </span>
            )}
          </span>
        </button>
      )}
      {error && <p className="text-sear text-[13px] mt-2">{error}</p>}
    </div>
  )
}
