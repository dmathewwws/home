import { useState } from 'react'
import { imgUrl } from '../lib/api'
import { formatWhen } from '../lib/dates'
import { hueFor } from '../lib/hues'
import type { Hobby, SessionEntry } from '../lib/types'
import { useHobbyData } from '../hooks/useHobbyData'
import { useToast } from './Toast'

interface EntryRowProps {
  entry: SessionEntry
  hobby: Hobby | undefined
}

export function EntryRow({ entry, hobby }: EntryRowProps) {
  const { removeSession } = useHobbyData()
  const showToast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const remove = async () => {
    setDeleting(true)
    try {
      await removeSession(entry.id)
      showToast('Entry deleted')
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete entry')
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <div className="entry" style={{ '--dot': hobby ? hueFor(hobby) : 'var(--color-muted)' } as React.CSSProperties}>
      <span className="entry-dot" />
      <div className="flex-1 min-w-0">
        <b className="block font-semibold text-[15px] truncate">{entry.pieceName ?? 'General practice'}</b>
        <span className="text-[12.5px] text-muted">{hobby?.name ?? 'Hobby'}</span>
      </div>
      {entry.photoId && (
        <a href={imgUrl(entry.photoId, 'full')} target="_blank" rel="noopener noreferrer">
          <img
            src={imgUrl(entry.photoId, 'thumb')}
            alt={`Photo of ${entry.pieceName ?? 'this session'}`}
            className="thumb"
            loading="lazy"
          />
        </a>
      )}
      <span className="when">{formatWhen(entry.date)}</span>
      {confirming ? (
        <div className="flex gap-1 items-center">
          <button
            className="text-[12px] font-semibold text-red-400 underline underline-offset-2 disabled:opacity-50"
            disabled={deleting}
            onClick={() => void remove()}
          >
            {deleting ? '…' : 'Delete'}
          </button>
          <button
            className="text-[12px] font-semibold text-muted underline underline-offset-2"
            disabled={deleting}
            onClick={() => setConfirming(false)}
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          className="text-muted hover:text-ink-soft text-[15px] leading-none px-1"
          aria-label="Delete entry"
          title="Delete entry"
          onClick={() => setConfirming(true)}
        >
          ×
        </button>
      )}
    </div>
  )
}
