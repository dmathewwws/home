/**
 * Secondary sources editor: other takes on the dish (a pro chef's video, an
 * article) — a link plus a free-text block of tips worth keeping from it.
 * Edit-screen only.
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

  const commitSource = () => {
    if (url.trim() && label.trim()) {
      onChange([...sources, { url: url.trim(), label: label.trim(), notes: '' }])
    }
    setUrl('')
    setLabel('')
    setAdding(false)
  }

  const setNotes = (i: number, notes: string) =>
    onChange(sources.map((s, j) => (j === i ? { ...s, notes } : s)))

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
          <textarea
            value={source.notes}
            onChange={(e) => setNotes(i, e.target.value)}
            rows={Math.max(2, source.notes.split('\n').length)}
            placeholder={'- what do they do differently?'}
            aria-label={`Notes for ${source.label}`}
            className="mt-1 ml-3.5 w-[calc(100%-0.875rem)] bg-kraft-lift border border-rule px-2.5 py-1.5 text-[14px] leading-[1.42] placeholder:text-rule outline-none resize-none"
          />
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
