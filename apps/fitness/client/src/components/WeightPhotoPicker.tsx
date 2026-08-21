/**
 * Progress-photo upload for weight entries: file picker (camera or library)
 * → client-side downscale to full + thumb JPEGs → direct PUT to R2 via
 * presigned URLs (worker fallback in dev) → hands back a confirmed photoId.
 *
 * `AddPhotoButton` is the compact control a log row uses to attach a photo to
 * an already-logged weigh-in.
 */

import { useCallback, useRef, useState } from 'react'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { processPhoto, putWithProgress } from '../lib/image'

export interface UploadedPhoto {
  photoId: string
  /** Local object URL of the thumb — shown until the server round-trip lands */
  previewUrl: string
}

/** Process + upload one file, reporting size-weighted progress across both PUTs. */
function useProgressPhotoUpload() {
  const { getProfileJwt } = useLocalFirstAuth()
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const upload = useCallback(
    async (file: File): Promise<UploadedPhoto | null> => {
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
        setProgress(null)
        return { photoId: slots.photoId, previewUrl: URL.createObjectURL(processed.thumb) }
      } catch (err) {
        setProgress(null)
        setError(err instanceof Error ? err.message : 'Photo upload failed')
        return null
      }
    },
    [getProfileJwt],
  )

  return { upload, progress, error, setError }
}

function FileInput({
  inputRef,
  onFile,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onFile: (file: File) => void
}) {
  return (
    <input
      ref={inputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0]
        if (file) onFile(file)
        // Reset so re-picking the same file still fires a change
        e.target.value = ''
      }}
    />
  )
}

/** Compact "＋ photo" control for a row in the entry log. */
export function AddPhotoButton({ onUploaded }: { onUploaded: (photo: UploadedPhoto) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { upload, progress, error } = useProgressPhotoUpload()

  const handleFile = async (file: File) => {
    const result = await upload(file)
    if (result) onUploaded(result)
  }

  return (
    <>
      <FileInput inputRef={inputRef} onFile={handleFile} />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={progress !== null}
        title={error ?? 'Add a progress photo'}
        aria-label="Add a progress photo"
        className={`w-11 h-11 shrink-0 rounded-xl border border-dashed grid place-items-center text-[10px] font-medium tabular-nums transition-colors disabled:opacity-60 ${
          error ? 'border-danger-line text-down' : 'border-line-btn text-faint hover:border-ink hover:text-ink'
        }`}
      >
        {progress !== null ? `${Math.round(progress * 100)}%` : '＋'}
      </button>
    </>
  )
}
