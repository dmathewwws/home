/**
 * "Paste it in" — paste the JSON your import tool produced. Parsing is local
 * and instant; nothing saves until the review screen's save button. The JSON
 * contract lives in docs/recipe-import-spec.md.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, SaveBar, TopBar } from '../components/Chrome'
import { IMPORT_FORMAT_SNIPPET, ImportJsonError, parseImportJson } from '../lib/import-json'
import type { ImportDraft } from '../lib/types'

export function PasteJson() {
  const navigate = useNavigate()
  const [raw, setRaw] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [draft, setDraft] = useState<ImportDraft | null>(null)
  const [copied, setCopied] = useState(false)

  const check = () => {
    if (!raw.trim()) return
    try {
      const parsed = parseImportJson(raw)
      setDraft(parsed)
      setError(null)
    } catch (err) {
      setDraft(null)
      setError(err instanceof ImportJsonError ? err.message : 'Could not read that JSON')
    }
  }

  const copyFormat = async () => {
    try {
      await navigator.clipboard.writeText(IMPORT_FORMAT_SNIPPET)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      // Clipboard unavailable (permissions/insecure context) — no-op
    }
  }

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TopBar left={<BackButton to="/" label="Cancel" />} right={<span className="eyebrow">Step 1 of 2</span>} />
        <div className="page-col px-5 pb-8">
          <h1 className="h-display text-[clamp(34px,10vw,42px)]">Paste it&nbsp;in</h1>

          <div className="bigfield mt-5">
            <label className="block font-mono2 text-[10.5px] tracking-[0.14em] uppercase text-muted mb-2.5" htmlFor="recipe-json">
              Recipe JSON
            </label>
            <textarea
              id="recipe-json"
              value={raw}
              onChange={(e) => {
                setRaw(e.target.value)
                setDraft(null)
                setError(null)
              }}
              placeholder={'{ "title": "…", "cards": [ … ] }'}
              spellCheck={false}
              autoComplete="off"
              rows={10}
              className="w-full bg-transparent border-2 border-ink p-3 font-mono2 text-[12.5px] leading-[1.5] outline-none placeholder:text-rule resize-y"
            />
            <div className="flex justify-between items-center mt-2.5">
              <button type="button" className="mono-link" onClick={copyFormat}>
                {copied ? 'Copied ✓' : 'Copy the format'}
              </button>
              <button
                type="button"
                onClick={check}
                disabled={!raw.trim()}
                className="font-mono2 text-[11px] tracking-[0.1em] uppercase bg-ink text-kraft px-3 py-2 disabled:opacity-45"
              >
                Check it
              </button>
            </div>
          </div>

          {draft && (
            <p className="mt-5 text-[15px] leading-normal">
              <span className="text-herb">&#10003;</span> Looks good — {draft.title}, {draft.cards.length} card
              {draft.cards.length === 1 ? '' : 's'}, {draft.ingredients.length} ingredient
              {draft.ingredients.length === 1 ? '' : 's'}.
            </p>
          )}

          {error && (
            <div className="mt-5">
              <p className="text-sear text-[15px] leading-normal">{error}</p>
              <button type="button" className="mono-link mt-3 inline-block" onClick={() => navigate('/add/manual')}>
                Type it out instead &rarr;
              </button>
            </div>
          )}

          <p className="mt-5 text-[14px] text-muted leading-normal">
            You'll see everything before it saves. Nothing goes in the box until you say so.
          </p>
        </div>
      </div>
      {draft && <SaveBar label="Review the breakdown" onClick={() => navigate('/add/review', { state: draft })} />}
    </section>
  )
}
