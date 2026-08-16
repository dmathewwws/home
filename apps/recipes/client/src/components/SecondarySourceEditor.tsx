/**
 * Secondary sources editor: other takes on the dish (a pro chef's video, an
 * article) — a link plus the tips worth keeping from it. Edit-screen only.
 */

import { useState } from 'react'
import type { RecipeSecondarySource } from '../lib/types'

interface SecondarySourceEditorProps {
  sources: RecipeSecondarySource[]
  onChange: (sources: RecipeSecondarySource[]) => void
}

export function SecondarySourceEditor({ sources, onChange }: SecondarySourceEditorProps) {
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')
  const [notingFor, setNotingFor] = useState<number | null>(null)
  const [note, setNote] = useState('')

  const commitSource = () => {
    if (url.trim() && label.trim()) {
      onChange([...sources, { url: url.trim(), label: label.trim(), notes: [] }])
    }
    setUrl('')
    setLabel('')
    setAdding(false)
  }

  const commitNote = (i: number) => {
    if (note.trim()) {
      onChange(sources.map((s, j) => (j === i ? { ...s, notes: [...s.notes, note.trim()] } : s)))
    }
    setNote('')
    setNotingFor(null)
  }

  const removeNote = (i: number, n: number) =>
    onChange(sources.map((s, j) => (j === i ? { ...s, notes: s.notes.filter((_, m) => m !== n) } : s)))

  return (
    <div>
      {sources.map((source, i) => (
        <div key={i} className="py-2 border-b border-dashed border-rule last:border-b-0">
          <div className="flex gap-[9px] items-baseline">
            <span className="font-mono2 text-[12px] flex-1 truncate">
              {source.label} <span className="text-muted">· {source.url}</span>
            </span>
            <button
              type="button"
              onClick={() => onChange(sources.filter((_, j) => j !== i))}
              className="font-mono2 text-[10px] text-muted"
              aria-label={`Remove source ${source.label}`}
            >
              &times;
            </button>
          </div>
          {source.notes.map((text, n) => (
            <div key={n} className="flex gap-[9px] items-baseline py-1 pl-3.5 text-[14.5px]">
              <span className="flex-1">{text}</span>
              <button
                type="button"
                onClick={() => removeNote(i, n)}
                className="font-mono2 text-[10px] text-muted"
                aria-label={`Remove note ${n + 1} from ${source.label}`}
              >
                &times;
              </button>
            </div>
          ))}
          {notingFor === i ? (
            <div className="mt-1 pl-3.5 space-y-2">
              <input
                autoFocus
                value={note}
                onChange={(e) => setNote(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && commitNote(i)}
                placeholder="What do they do differently?"
                className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 text-[14px] placeholder:text-rule outline-none"
              />
              <div className="flex gap-2">
                <button type="button" className="chip" onClick={() => commitNote(i)}>
                  Keep note
                </button>
                <button type="button" className="chip" onClick={() => { setNote(''); setNotingFor(null) }}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="font-mono2 text-[10px] text-muted mt-1 pl-3.5"
              onClick={() => { setNote(''); setNotingFor(i) }}
            >
              + Add a note
            </button>
          )}
        </div>
      ))}
      {adding ? (
        <div className="mt-2 space-y-2">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="Link (youtube, article…)"
            className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 font-mono2 text-[12px] placeholder:text-rule outline-none"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitSource()}
            placeholder="Who it's from"
            className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 text-[14px] placeholder:text-rule outline-none"
          />
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={commitSource}>
              Keep source
            </button>
            <button type="button" className="chip" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="addcard mt-3" onClick={() => setAdding(true)}>
          + Add a source
        </button>
      )}
    </div>
  )
}
