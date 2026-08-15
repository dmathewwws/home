/**
 * "If you're out" editor: missing ingredient → replacement, with the
 * consequence written into the replacement text.
 */

import { useState } from 'react'
import type { RecipeSwap } from '../lib/types'

interface SwapEditorProps {
  swaps: RecipeSwap[]
  onChange: (swaps: RecipeSwap[]) => void
}

export function SwapEditor({ swaps, onChange }: SwapEditorProps) {
  const [adding, setAdding] = useState(false)
  const [ingredient, setIngredient] = useState('')
  const [replacement, setReplacement] = useState('')

  const commit = () => {
    if (ingredient.trim() && replacement.trim()) {
      onChange([...swaps, { ingredient: ingredient.trim(), replacement: replacement.trim() }])
    }
    setIngredient('')
    setReplacement('')
    setAdding(false)
  }

  return (
    <div>
      {swaps.map((swap, i) => (
        <div key={i} className="flex gap-[9px] items-baseline py-1 text-[14.5px]">
          <s className="font-mono2 text-[11px] text-muted no-underline">{swap.ingredient}</s>
          <span className="flex-1">{swap.replacement}</span>
          <button
            type="button"
            onClick={() => onChange(swaps.filter((_, j) => j !== i))}
            className="font-mono2 text-[10px] text-muted"
            aria-label={`Remove swap for ${swap.ingredient}`}
          >
            &times;
          </button>
        </div>
      ))}
      {adding ? (
        <div className="mt-2 space-y-2">
          <input
            autoFocus
            value={ingredient}
            onChange={(e) => setIngredient(e.target.value)}
            placeholder="If you're out of…"
            className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 font-mono2 text-[12px] placeholder:text-rule outline-none"
          />
          <input
            value={replacement}
            onChange={(e) => setReplacement(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commit()}
            placeholder="use… and say how it changes the dish"
            className="w-full bg-kraft-lift border border-rule px-2.5 py-1.5 text-[14px] placeholder:text-rule outline-none"
          />
          <div className="flex gap-2">
            <button type="button" className="chip" onClick={commit}>
              Keep swap
            </button>
            <button type="button" className="chip" onClick={() => setAdding(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button type="button" className="addcard mt-3" onClick={() => setAdding(true)}>
          + Add a swap
        </button>
      )}
    </div>
  )
}
