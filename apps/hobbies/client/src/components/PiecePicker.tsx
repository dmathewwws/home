import { useState } from 'react'
import { hueFor } from '../lib/hues'
import type { Hobby, Piece } from '../lib/types'
import { useHobbyData } from '../hooks/useHobbyData'
import { useToast } from './Toast'

interface PiecePickerProps {
  hobby: Hobby
  selectedPieceId: string | null
  onSelect: (pieceId: string | null) => void
}

/**
 * The piece list inside the picker. Learn hobbies get rows with lesson-link
 * pills (tapping a pill opens the lesson, not the row); craft hobbies get
 * light prompt chips.
 */
export function PiecePicker({ hobby, selectedPieceId, onSelect }: PiecePickerProps) {
  const { pieces } = useHobbyData()
  const [adding, setAdding] = useState(false)
  const hue = hueFor(hobby)
  const hobbyPieces = pieces.filter((p) => p.hobbyId === hobby.id)

  const toggle = (piece: Piece) =>
    onSelect(selectedPieceId === piece.id ? null : piece.id)

  return (
    <div>
      {hobby.kind === 'learn' ? (
        <div className="flex flex-col gap-2">
          {hobbyPieces.map((piece) => (
            <button
              key={piece.id}
              className="prow"
              style={{ '--dot': hue } as React.CSSProperties}
              aria-pressed={selectedPieceId === piece.id}
              onClick={(e) => {
                // A link-pill tap opens the lesson; it must not select the row
                if ((e.target as HTMLElement).closest('.watch-pill')) return
                toggle(piece)
              }}
            >
              <span className="prow-dot" />
              <span className="flex-1 min-w-0 truncate">{piece.name}</span>
              {selectedPieceId === piece.id && <span className="text-[13px] text-select">✓</span>}
              {piece.links.map((link) => (
                <a
                  key={link.url}
                  className="watch-pill"
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {link.label === 'WATCH' && (
                    <svg viewBox="0 0 24 24" className="w-[11px] h-[11px] fill-current" aria-hidden="true">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                  {link.label}
                </a>
              ))}
            </button>
          ))}
          <button className="chip chip-small chip-ghost self-start" onClick={() => setAdding((v) => !v)}>
            {adding ? '× Cancel' : '+ Add a piece with its link'}
          </button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-[10px]">
          {hobbyPieces.map((piece) => (
            <button
              key={piece.id}
              className="chip chip-small"
              style={{ '--dot': hue } as React.CSSProperties}
              aria-pressed={selectedPieceId === piece.id}
              onClick={() => toggle(piece)}
            >
              <span className="chip-dot" />
              {piece.name}
              {selectedPieceId === piece.id && <span className="text-[13px] text-select">✓</span>}
            </button>
          ))}
          <button className="chip chip-small chip-ghost" onClick={() => setAdding((v) => !v)}>
            {adding ? '× Cancel' : '+ Add'}
          </button>
        </div>
      )}
      {adding && (
        <AddPieceForm
          hobby={hobby}
          onAdded={(piece) => {
            setAdding(false)
            onSelect(piece.id)
          }}
        />
      )}
    </div>
  )
}

function AddPieceForm({ hobby, onAdded }: { hobby: Hobby; onAdded: (piece: Piece) => void }) {
  const { addPiece } = useHobbyData()
  const showToast = useToast()
  const [name, setName] = useState('')
  const [label, setLabel] = useState('WATCH')
  const [url, setUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const isLearn = hobby.kind === 'learn'

  const save = async () => {
    if (!name.trim() || saving) return
    if (isLearn && url.trim() && !/^https?:\/\//.test(url.trim())) {
      showToast('Link must start with http(s)://')
      return
    }
    setSaving(true)
    try {
      const links = isLearn && url.trim() ? [{ label: label.trim() || 'WATCH', url: url.trim() }] : []
      const piece = await addPiece(hobby.id, name.trim(), links)
      showToast(`“${piece.name}” added`)
      onAdded(piece)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not add piece')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card mt-3 rise flex flex-col gap-2">
      <input
        className="field"
        placeholder={isLearn ? 'Piece or topic name' : 'Prompt name'}
        value={name}
        maxLength={80}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void save()}
      />
      {isLearn && (
        <div className="flex gap-2">
          <select
            className="field !w-[110px] flex-none"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            aria-label="Link type"
          >
            <option value="WATCH">WATCH</option>
            <option value="READ">READ</option>
            <option value="TAB">TAB</option>
          </select>
          <input
            className="field"
            placeholder="Lesson link (optional)"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void save()}
          />
        </div>
      )}
      <button className="btn-log" disabled={!name.trim() || saving} onClick={() => void save()}>
        {saving ? 'Adding…' : 'Add piece'}
      </button>
    </div>
  )
}
