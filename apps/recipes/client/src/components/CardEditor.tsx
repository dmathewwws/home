/**
 * Instruction-card editors with the live 140-character counter. The counter
 * exists only while writing — read views never show it. Over-limit cards go
 * sear red; the optional onSplit hook (import review) offers "Split in two".
 */

import { useRef } from 'react'
import { CARD_MAX_CHARS, type RecipeCard } from '../lib/types'

interface CardEditorProps {
  index: number
  card: RecipeCard
  onChange: (card: RecipeCard) => void
  onRemove?: () => void
  onSplit?: () => void
  placeholder?: string
}

export function CardEditor({ index, card, onChange, onRemove, onSplit, placeholder }: CardEditorProps) {
  const len = card.text.length
  const over = len > CARD_MAX_CHARS
  const areaRef = useRef<HTMLTextAreaElement>(null)

  const autosize = () => {
    const el = areaRef.current
    if (el) {
      el.style.height = 'auto'
      el.style.height = `${el.scrollHeight}px`
    }
  }

  return (
    <div className={`border bg-kraft-lift p-[13px] mb-2.5 ${over ? 'border-sear' : 'border-rule'}`}>
      <div className="flex justify-between items-baseline mb-2">
        <span className="font-mono2 text-[11px] text-yolk tracking-[0.06em]">{String(index + 1).padStart(2, '0')}</span>
        <span className={`cc ${over ? 'cc-over' : ''}`}>
          {len} / {CARD_MAX_CHARS}
          {over && onSplit && (
            <button
              type="button"
              onClick={onSplit}
              className="font-mono2 text-[10px] tracking-[0.12em] uppercase border border-sear text-sear px-2 py-[3px] ml-[9px]"
            >
              Split in two
            </button>
          )}
        </span>
      </div>
      <textarea
        ref={areaRef}
        value={card.text}
        onChange={(e) => {
          onChange({ ...card, text: e.target.value })
          autosize()
        }}
        onFocus={autosize}
        rows={2}
        placeholder={placeholder ?? 'What happens next?'}
        className="w-full bg-transparent resize-none outline-none text-[15.5px] leading-[1.45] font-body placeholder:text-rule"
      />
      <div className="flex items-center gap-2 mt-1.5">
        <input
          value={card.timer ?? ''}
          onChange={(e) => onChange({ ...card, timer: e.target.value || undefined })}
          placeholder="timer? 10 min"
          className="w-28 bg-transparent border border-rule px-2 py-[3px] font-mono2 text-[10px] tracking-[0.1em] uppercase placeholder:text-rule outline-none"
        />
        {onRemove && (
          <button type="button" onClick={onRemove} className="ml-auto font-mono2 text-[10px] tracking-[0.12em] uppercase text-muted">
            Drop card
          </button>
        )}
      </div>
    </div>
  )
}

/**
 * Split an over-limit card at the sentence boundary nearest its midpoint
 * (falling back to the nearest space), returning two cards.
 */
export function splitCard(card: RecipeCard): [RecipeCard, RecipeCard] {
  const text = card.text.trim()
  const mid = text.length / 2

  let best = -1
  let bestDist = Infinity
  const boundary = /[.!?]\s+|,\s+/g
  let m: RegExpExecArray | null
  while ((m = boundary.exec(text))) {
    const idx = m.index + m[0].length
    const dist = Math.abs(idx - mid)
    if (dist < bestDist) {
      best = idx
      bestDist = dist
    }
  }
  if (best === -1) {
    const spaceLeft = text.lastIndexOf(' ', mid)
    const spaceRight = text.indexOf(' ', mid)
    best = spaceLeft === -1 ? spaceRight : mid - spaceLeft <= (spaceRight === -1 ? Infinity : spaceRight - mid) ? spaceLeft + 1 : spaceRight + 1
  }
  if (best <= 0 || best >= text.length) return [card, { text: '' }]
  return [{ ...card, text: text.slice(0, best).trim() }, { text: text.slice(best).trim() }]
}
