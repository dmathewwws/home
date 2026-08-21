/**
 * "Variations" editor: named takes on the base recipe ("Chocolate" →
 * "1 tbsp cocoa in the base + dark chips on top").
 */

import { useState } from 'react'
import type { RecipeVariation } from '../lib/types'

interface VariationEditorProps {
  variations: RecipeVariation[]
  onChange: (variations: RecipeVariation[]) => void
}

export function VariationEditor({ variations, onChange }: VariationEditorProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [detail, setDetail] = useState('')

  const commit = () => {
    if (name.trim()) {
      onChange([...variations, { name: name.trim(), detail: detail.trim() }])
    }
    setName('')
    setDetail('')
    setAdding(false)
  }

  return (
    <div>
      {variations.map((variation, i) => (
        <div key={i} className="flex gap-[9px] items-baseline py-1 text-[14.5px]">
          <span className="font-mono2 text-[11px] text-muted">{variation.name}</span>
          <span className="flex-1">{variation.detail}</span>
          <button
            type="button"
            onClick={() => onChange(variations.filter((_, j) => j !== i))}
            className="font-mono2 text-[10px] text-muted"
            aria-label={`Remove variation ${variation.name}`}
          >
            &times;
          </button>
        </div>
      ))}
      {adding ? (
        <div className="mt-2 space-y-2">
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            placeholder="Name it — Chocolate, Berry, Nutty…"
            className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 font-mono2 text-[12px] placeholder:text-rule outline-none"
          />
          <input
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            maxLength={200}
            placeholder="what changes — cocoa in the base, chips on top"
            className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 text-[14px] placeholder:text-rule outline-none"
          />
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={commit}>
              Keep variation
            </button>
            <button type="button" className="chip" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="addcard mt-3" onClick={() => setAdding(true)}>
          + Add a variation
        </button>
      )}
    </div>
  )
}
