import { useEffect, useRef, useState } from 'react'
import { requestUpload } from '../lib/api'
import { processPhoto, putWithProgress } from '../lib/image'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { useToast } from './Toast'

interface PhotoAttachProps {
  /** The uploaded photo's id (or null) — passed along when logging. */
  photoId: string | null
  onChange: (photoId: string | null) => void
}

/**
 * Craft-only photo attachment. Picks a file, downsizes to full+thumb JPEGs
 * client-side, and PUTs both (presigned direct-to-R2 in prod, worker
 * dev-upload route locally). Only the photoId travels with the log request.
 */
export function PhotoAttach({ photoId, onChange }: PhotoAttachProps) {
  const { getProfileJwt } = useLocalFirstAuth()
  const showToast = useToast()
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  // Revoke the local object URL when it's replaced or on unmount
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  const pick = async (file: File) => {
    setUploading(true)
    setProgress(0)
    try {
      const [processed, upload] = await Promise.all([processPhoto(file), requestUpload(getProfileJwt)])
      await Promise.all([
        putWithProgress(upload.fullUrl, processed.full, setProgress),
        putWithProgress(upload.thumbUrl, processed.thumb),
      ])
      setPreviewUrl(URL.createObjectURL(processed.thumb))
      onChange(upload.photoId)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Photo upload failed')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="mt-[14px] border-t border-dashed border-line-strong pt-[14px]">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          e.target.value = ''
          if (file) void pick(file)
        }}
      />
      {photoId && previewUrl ? (
        <div className="flex items-center gap-3">
          <img src={previewUrl} alt="Attached drawing" className="thumb" />
          <span className="flex-1 text-[14px] font-semibold text-ink-soft">Photo attached ✓</span>
          <button
            className="text-[12.5px] font-semibold text-muted underline underline-offset-2"
            onClick={() => {
              onChange(null)
              setPreviewUrl(null)
            }}
          >
            Remove
          </button>
        </div>
      ) : (
        <button
          className="flex items-center gap-[10px] w-full px-[15px] py-[13px] border-[1.5px] border-dashed
                     border-line-strong rounded-[14px] text-[14px] font-medium text-ink-soft bg-transparent"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <svg
            viewBox="0 0 24 24"
            className="w-[19px] h-[19px]"
            style={{ color: 'var(--dot)' }}
            fill="none"
            stroke="currentColor"
            strokeWidth={1.7}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <rect x="3" y="6" width="18" height="14" rx="3" />
            <circle cx="12" cy="13" r="3.4" />
            <path d="M9 6l1.2-2h3.6L15 6" />
          </svg>
          {uploading ? `Uploading… ${Math.round(progress * 100)}%` : "Add a photo of today's drawing"}
        </button>
      )}
    </div>
  )
}
