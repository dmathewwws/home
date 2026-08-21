/**
 * Entry log for the Weight tab: every weigh-in newest-first with its
 * day-over-day delta, an optional progress photo (tap to enlarge), and a
 * two-tap delete. Long histories collapse to the most recent rows.
 */

import { useEffect, useState } from 'react'
import type { WeightEntry } from '../lib/types'
import { imgUrl } from '../lib/api'
import { formatShort } from '../lib/dates'
import { AddPhotoButton, type UploadedPhoto } from './WeightPhotoPicker'

const COLLAPSED_ROWS = 12

interface WeightLogProps {
  /** Oldest first — the same merged list the chart plots */
  entries: WeightEntry[]
  onDelete: (date: string) => Promise<void>
  onAttachPhoto: (date: string, kg: number, photoId: string) => Promise<void>
}

export function WeightLog({ entries, onDelete, onAttachPhoto }: WeightLogProps) {
  const [expanded, setExpanded] = useState(false)
  const [confirmDate, setConfirmDate] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  // Just-uploaded thumbs, shown until the refetch carries the real photoId
  const [previews, setPreviews] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!lightbox) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setLightbox(null)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [lightbox])

  // Newest first, each row paired with the entry before it for the delta
  const rows = entries
    .map((entry, i) => ({ entry, previous: i > 0 ? entries[i - 1] : null }))
    .reverse()
  const visible = expanded ? rows : rows.slice(0, COLLAPSED_ROWS)

  const handleDelete = async (date: string) => {
    setConfirmDate(null)
    setError(null)
    try {
      await onDelete(date)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete — try again')
    }
  }

  const handleAttach = async (entry: WeightEntry, photo: UploadedPhoto) => {
    setError(null)
    setPreviews((p) => ({ ...p, [entry.date]: photo.previewUrl }))
    try {
      await onAttachPhoto(entry.date, entry.kg, photo.photoId)
    } catch (err) {
      setPreviews((p) => {
        const next = { ...p }
        delete next[entry.date]
        return next
      })
      setError(err instanceof Error ? err.message : 'Could not attach the photo — try again')
    }
  }

  return (
    <section className="card mt-4">
      <div className="flex items-baseline justify-between mb-1">
        <div className="card-title">Entry log</div>
        <div className="card-sub">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="mt-3 h-[76px] flex items-center justify-center rounded-2xl border border-dashed border-line-btn text-[13px] text-faint">
          Your logged weights will show up here.
        </div>
      ) : (
        <ul className="mt-1">
          {visible.map(({ entry, previous }) => {
            const delta = previous ? entry.kg - previous.kg : null
            const losing = delta !== null && delta <= 0
            const preview = previews[entry.date]
            return (
              <li
                key={entry.date}
                className="flex items-center gap-3 py-2.5 border-t border-line-2 first:border-t-0"
              >
                {entry.photoId || preview ? (
                  <button
                    type="button"
                    onClick={() => entry.photoId && setLightbox(entry.photoId)}
                    className="w-11 h-11 shrink-0 rounded-xl overflow-hidden border border-line-2"
                    aria-label={`Progress photo from ${formatShort(entry.date)}`}
                  >
                    <img
                      src={preview ?? imgUrl(entry.photoId!, 'thumb')}
                      alt=""
                      loading="lazy"
                      className="block w-full h-full object-cover"
                    />
                  </button>
                ) : (
                  <AddPhotoButton onUploaded={(photo) => handleAttach(entry, photo)} />
                )}

                <div className="min-w-0 flex-1">
                  <div className="font-mono text-[13px] font-medium tabular-nums">
                    {formatShort(entry.date)}
                  </div>
                  <div className="text-[0.68rem] font-medium text-ink-2 mt-px">
                    {delta === null || delta === 0 ? (
                      delta === 0 ? 'no change' : 'first entry'
                    ) : (
                      <span className={losing ? 'text-up' : 'text-down'}>
                        {losing ? '▼' : '▲'} {Math.abs(delta).toFixed(1)} kg
                      </span>
                    )}
                  </div>
                </div>

                <b className="font-mono text-[15px] font-medium tabular-nums">
                  {entry.kg.toFixed(1)}
                  <small className="text-[11px] font-medium text-ink-3"> kg</small>
                </b>

                {confirmDate === entry.date ? (
                  <span className="flex shrink-0 items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleDelete(entry.date)}
                      className="rounded-full border border-danger-line bg-danger-bg px-2 py-1 text-[0.68rem] font-semibold text-down"
                    >
                      Delete
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDate(null)}
                      className="text-[0.68rem] font-medium text-ink-2 px-1"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setConfirmDate(entry.date)}
                    aria-label={`Delete entry for ${formatShort(entry.date)}`}
                    className="w-7 h-7 shrink-0 grid place-items-center rounded-full text-[0.95rem] leading-none text-faint transition-colors hover:text-down"
                  >
                    ×
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      )}

      {rows.length > COLLAPSED_ROWS && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-2.5 pt-3 w-full border-t border-line-2 text-[0.72rem] font-semibold text-ink-2 hover:text-ink"
        >
          {expanded ? 'Show less' : `Show all (${rows.length})`}
        </button>
      )}

      {error && <div className="mt-3 text-[0.78rem] text-down">{error}</div>}

      {lightbox && (
        <div
          role="presentation"
          onClick={() => setLightbox(null)}
          className="fixed inset-0 z-50 bg-ink/80 p-5 flex items-center justify-center"
        >
          <img
            src={imgUrl(lightbox, 'full')}
            alt="Progress photo"
            className="max-w-full max-h-full rounded-2xl object-contain"
          />
        </div>
      )}
    </section>
  )
}
