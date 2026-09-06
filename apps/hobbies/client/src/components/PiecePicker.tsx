import { useState } from 'react'
import { hueFor } from '../lib/hues'
import type { Hobby, Piece, PieceLink } from '../lib/types'
import { useHobbyData } from '../hooks/useHobbyData'
import { useToast } from './Toast'

interface PiecePickerProps {
  hobby: Hobby
  selectedPieceId: string | null
  onSelect: (pieceId: string | null) => void
}

const LINK_LABELS = ['WATCH', 'READ', 'TAB']

/**
 * The piece list inside the picker. Learn hobbies get rows with lesson-link
 * pills (tapping a pill opens the lesson, not the row); craft hobbies get
 * light prompt chips.
 *
 * "Edit" flips the list into edit mode: rows stop being selectable and grow a
 * ✎ / × pair instead. The two modes render different elements on purpose —
 * a selectable row is a <button>, and buttons can't nest.
 */
export function PiecePicker({ hobby, selectedPieceId, onSelect }: PiecePickerProps) {
  const { pieces } = useHobbyData()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editingPieceId, setEditingPieceId] = useState<string | null>(null)
  const hue = hueFor(hobby)
  const hobbyPieces = pieces.filter((p) => p.hobbyId === hobby.id)
  const editingPiece = hobbyPieces.find((p) => p.id === editingPieceId) ?? null

  const toggle = (piece: Piece) =>
    onSelect(selectedPieceId === piece.id ? null : piece.id)

  // The add form and the edit form share one slot below the list
  const toggleAdding = () => {
    setEditingPieceId(null)
    setAdding((v) => !v)
  }

  const toggleEditing = () => {
    setEditingPieceId(null)
    setAdding(false)
    setEditing((v) => !v)
  }

  const startEdit = (piece: Piece) => {
    setAdding(false)
    setEditingPieceId((id) => (id === piece.id ? null : piece.id))
  }

  /** A deleted piece can't stay picked (or half-edited). */
  const afterRemove = (piece: Piece) => {
    if (selectedPieceId === piece.id) onSelect(null)
    if (editingPieceId === piece.id) setEditingPieceId(null)
    // Nothing left to edit — and the Done button goes with the rows
    if (hobbyPieces.length <= 1) setEditing(false)
  }

  const editToggle = hobbyPieces.length > 0 && (
    <button className="chip chip-small chip-ghost" onClick={toggleEditing}>
      {editing ? 'Done' : 'Edit'}
    </button>
  )

  return (
    <div>
      {hobby.kind === 'learn' ? (
        <div className="flex flex-col gap-2">
          {hobbyPieces.map((piece) =>
            editing ? (
              <div
                key={piece.id}
                className="prow cursor-default"
                style={{ '--dot': hue } as React.CSSProperties}
              >
                <span className="prow-dot" />
                <span className="flex-1 min-w-0 truncate">{piece.name}</span>
                <PieceActions
                  piece={piece}
                  active={editingPieceId === piece.id}
                  onEdit={() => startEdit(piece)}
                  onRemoved={() => afterRemove(piece)}
                />
              </div>
            ) : (
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
            ),
          )}
          <div className="flex gap-2 self-start">
            <button className="chip chip-small chip-ghost" onClick={toggleAdding}>
              {adding ? '× Cancel' : '+ Add a piece with its link'}
            </button>
            {editToggle}
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-[10px]">
          {hobbyPieces.map((piece) =>
            editing ? (
              <span
                key={piece.id}
                className="chip chip-small"
                style={{ '--dot': hue } as React.CSSProperties}
              >
                <span className="chip-dot" />
                {piece.name}
                <PieceActions
                  piece={piece}
                  active={editingPieceId === piece.id}
                  onEdit={() => startEdit(piece)}
                  onRemoved={() => afterRemove(piece)}
                />
              </span>
            ) : (
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
            ),
          )}
          <button className="chip chip-small chip-ghost" onClick={toggleAdding}>
            {adding ? '× Cancel' : '+ Add'}
          </button>
          {editToggle}
        </div>
      )}
      {(adding || editingPiece) && (
        <PieceForm
          // Remount when the target changes so the fields reseed
          key={editingPiece?.id ?? 'new'}
          hobby={hobby}
          piece={editingPiece ?? undefined}
          onSaved={(piece) => {
            if (editingPiece) {
              setEditingPieceId(null)
            } else {
              setAdding(false)
              onSelect(piece.id)
            }
          }}
        />
      )}
    </div>
  )
}

const ACTION_BTN = 'text-muted hover:text-ink-soft text-[15px] leading-none px-1'

/** Edit-mode controls for one piece: ✎, and × behind a Delete/Keep confirm. */
function PieceActions({
  piece,
  active,
  onEdit,
  onRemoved,
}: {
  piece: Piece
  /** Whether this piece's edit form is the one currently open. */
  active: boolean
  onEdit: () => void
  onRemoved: () => void
}) {
  const { removePiece } = useHobbyData()
  const showToast = useToast()
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const remove = async () => {
    setDeleting(true)
    try {
      await removePiece(piece.id)
      showToast(`“${piece.name}” deleted`)
      onRemoved()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not delete piece')
      setDeleting(false)
      setConfirming(false)
    }
  }

  if (confirming) {
    return (
      <span className="flex gap-1 items-center">
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
      </span>
    )
  }

  return (
    <span className="flex gap-1 items-center">
      <button
        className={active ? `${ACTION_BTN} !text-ink` : ACTION_BTN}
        aria-label={`Edit ${piece.name}`}
        title="Edit"
        onClick={onEdit}
      >
        ✎
      </button>
      <button
        className={ACTION_BTN}
        aria-label={`Delete ${piece.name}`}
        title="Delete"
        onClick={() => setConfirming(true)}
      >
        ×
      </button>
    </span>
  )
}

/** Add a piece, or edit one when `piece` is given — same fields either way. */
function PieceForm({
  hobby,
  piece,
  onSaved,
}: {
  hobby: Hobby
  piece?: Piece
  onSaved: (piece: Piece) => void
}) {
  const { addPiece, editPiece } = useHobbyData()
  const showToast = useToast()
  const [name, setName] = useState(piece?.name ?? '')
  const [label, setLabel] = useState(piece?.links[0]?.label ?? 'WATCH')
  const [url, setUrl] = useState(piece?.links[0]?.url ?? '')
  const [saving, setSaving] = useState(false)
  const isLearn = hobby.kind === 'learn'
  const labels = LINK_LABELS.includes(label) ? LINK_LABELS : [label, ...LINK_LABELS]

  const save = async () => {
    if (!name.trim() || saving) return
    if (isLearn && url.trim() && !/^https?:\/\//.test(url.trim())) {
      showToast('Link must start with http(s)://')
      return
    }
    setSaving(true)
    try {
      // Clearing the URL field drops the link
      const links: PieceLink[] =
        isLearn && url.trim() ? [{ label: label.trim() || 'WATCH', url: url.trim() }] : []
      const saved = piece
        ? await editPiece(piece.id, name.trim(), links)
        : await addPiece(hobby.id, name.trim(), links)
      showToast(piece ? `“${saved.name}” saved` : `“${saved.name}” added`)
      onSaved(saved)
    } catch (e) {
      const fallback = piece ? 'Could not save piece' : 'Could not add piece'
      showToast(e instanceof Error ? e.message : fallback)
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
            {labels.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
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
        {saving ? (piece ? 'Saving…' : 'Adding…') : piece ? 'Save piece' : 'Add piece'}
      </button>
    </div>
  )
}
