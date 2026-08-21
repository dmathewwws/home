/**
 * Sources editor: places to revisit this recipe (a video, an article, a book
 * page) — just a link plus an optional label.
 */

import { useState } from 'react'
import type { RecipeSource } from '../lib/types'

interface SourcesEditorProps {
  sources: RecipeSource[]
  onChange: (sources: RecipeSource[]) => void
}

export function SourcesEditor({ sources, onChange }: SourcesEditorProps) {
  const [adding, setAdding] = useState(false)
  const [url, setUrl] = useState('')
  const [label, setLabel] = useState('')

  const commitSource = () => {
    if (url.trim()) {
      const trimmedLabel = label.trim()
      onChange([...sources, trimmedLabel ? { url: url.trim(), label: trimmedLabel } : { url: url.trim() }])
    }
    setUrl('')
    setLabel('')
    setAdding(false)
  }

  return (
    <div>
      {sources.map((source, i) => (
        <div key={i} className="flex gap-[9px] items-baseline py-2 border-b border-dashed border-rule last:border-b-0">
          <span className="font-mono2 text-[12px] flex-1 truncate">
            {source.label ? (
              <>
                {source.label} <span className="text-muted">&middot; {source.url}</span>
              </>
            ) : (
              source.url
            )}
          </span>
          <button
            type="button"
            onClick={() => onChange(sources.filter((_, j) => j !== i))}
            className="font-mono2 text-[10px] text-muted"
            aria-label={`Remove source ${source.label ?? source.url}`}
          >
            &times;
          </button>
        </div>
      ))}
      {adding ? (
        <div className="mt-2 space-y-2">
          <input
            autoFocus
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitSource()}
            placeholder="Link (youtube, article…)"
            className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 font-mono2 text-[12px] placeholder:text-rule outline-none"
          />
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitSource()}
            placeholder="Label (optional)"
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
