/**
 * Ingredient picker for manual entry: picked chips (tap to remove), search
 * with catalog matches + "add as new" (with an inline role choice), and the
 * "You use these a lot" frequent tray. Amounts are edited on picked chips
 * via a small prompt row.
 */

import { useEffect, useRef, useState } from 'react'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { INGREDIENT_ROLES, type Ingredient, type IngredientRole } from '../lib/types'
import { IngChip } from './IngChip'

export interface PickedIngredient {
  /** Catalog id when known; new ingredients carry name+role only */
  ingredientId?: string
  name: string
  role: IngredientRole
  amount: string | null
}

interface IngredientPickerProps {
  picked: PickedIngredient[]
  onChange: (picked: PickedIngredient[]) => void
}

const ROLE_LABEL: Record<IngredientRole, string> = {
  protein: 'Protein',
  aromatic: 'Aromatic',
  produce: 'Produce',
  pantry: 'Pantry',
}

export function IngredientPicker({ picked, onChange }: IngredientPickerProps) {
  const { getProfileJwt } = useLocalFirstAuth()
  const [query, setQuery] = useState('')
  const [matches, setMatches] = useState<Ingredient[]>([])
  const [frequent, setFrequent] = useState<Ingredient[]>([])
  const [pendingNew, setPendingNew] = useState<string | null>(null) // name awaiting a role
  const [amountFor, setAmountFor] = useState<string | null>(null) // picked name awaiting amount
  const [amountDraft, setAmountDraft] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    api.frequentIngredients(getProfileJwt).then(setFrequent).catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    clearTimeout(debounceRef.current)
    const q = query.trim()
    if (!q) {
      setMatches([])
      return
    }
    debounceRef.current = setTimeout(() => {
      api.searchIngredients(getProfileJwt, q).then(setMatches).catch(() => {})
    }, 200)
    return () => clearTimeout(debounceRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query])

  const isPicked = (name: string) => picked.some((p) => p.name.toLowerCase() === name.toLowerCase())

  const add = (ing: { ingredientId?: string; name: string; role: IngredientRole }) => {
    if (isPicked(ing.name)) return
    onChange([...picked, { ...ing, amount: null }])
    setQuery('')
    setMatches([])
    setPendingNew(null)
    // Offer an amount right after picking
    setAmountFor(ing.name)
    setAmountDraft('')
  }

  const remove = (name: string) => {
    onChange(picked.filter((p) => p.name !== name))
    if (amountFor === name) setAmountFor(null)
  }

  const commitAmount = () => {
    if (amountFor) {
      onChange(picked.map((p) => (p.name === amountFor ? { ...p, amount: amountDraft.trim() || null } : p)))
    }
    setAmountFor(null)
    setAmountDraft('')
  }

  const exactMatch = matches.some((m) => m.name.toLowerCase() === query.trim().toLowerCase())

  return (
    <div>
      {/* Picked tray */}
      <div className="flex flex-wrap gap-[5px] min-h-[34px] p-3 border border-ink bg-[#00000006] mb-4">
        {picked.length === 0 && <span className="font-mono2 text-[11px] text-muted self-center">Nothing picked yet</span>}
        {picked.map((p) => (
          <IngChip key={p.name} name={p.name} role={p.role} amount={p.amount} on onClick={() => remove(p.name)} />
        ))}
      </div>

      {/* Amount mini-row for the just-picked ingredient */}
      {amountFor && (
        <div className="flex items-center gap-2 mb-3.5">
          <span className="font-mono2 text-[10.5px] uppercase tracking-[0.1em] text-muted">{amountFor} &middot; amount</span>
          <input
            autoFocus
            value={amountDraft}
            onChange={(e) => setAmountDraft(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && commitAmount()}
            onBlur={commitAmount}
            placeholder="400g / 2 cloves / skip"
            className="flex-1 bg-kraft-lift border border-rule px-2.5 py-1.5 font-mono2 text-[12px] placeholder:text-rule"
          />
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-[9px] border border-rule bg-kraft-lift px-3 py-2.5 mb-3.5">
        <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-none text-muted" fill="none" stroke="currentColor" strokeWidth={2}>
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-4-4" />
        </svg>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Find an ingredient"
          className="flex-1 bg-transparent font-mono2 text-[13px] text-ink placeholder:text-muted outline-none"
        />
      </div>

      {/* Matches + add-as-new */}
      {query.trim() && (
        <div className="mb-4">
          <em className="font-mono2 not-italic text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">Matches</em>
          <div className="flex flex-wrap gap-[5px]">
            {matches
              .filter((m) => !isPicked(m.name))
              .map((m) => (
                <IngChip key={m.id} name={m.name} role={m.role} onClick={() => add({ ingredientId: m.id, name: m.name, role: m.role })} />
              ))}
            {!exactMatch && (
              <button type="button" className="ing ing-add" onClick={() => setPendingNew(query.trim())}>
                Add &ldquo;{query.trim()}&rdquo; as new
              </button>
            )}
          </div>
          {pendingNew && (
            <div className="flex items-center gap-2 mt-2.5">
              <span className="font-mono2 text-[10.5px] uppercase tracking-[0.1em] text-muted">{pendingNew} is&hellip;</span>
              {INGREDIENT_ROLES.map((role) => (
                <button key={role} type="button" className="chip" onClick={() => add({ name: pendingNew, role })}>
                  {ROLE_LABEL[role]}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Frequent tray */}
      {frequent.length > 0 && (
        <div>
          <em className="font-mono2 not-italic text-[10px] tracking-[0.14em] uppercase text-muted block mb-2">You use these a lot</em>
          <div className="flex flex-wrap gap-[5px]">
            {frequent
              .filter((f) => !isPicked(f.name))
              .map((f) => (
                <IngChip key={f.id} name={f.name} role={f.role} onClick={() => add({ ingredientId: f.id, name: f.name, role: f.role })} />
              ))}
          </div>
        </div>
      )}
    </div>
  )
}
