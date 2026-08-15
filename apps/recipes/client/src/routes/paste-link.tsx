/**
 * "Where's it from?" — paste a video link. The parse is one synchronous
 * request; the staged checklist is honest theater: stage one spins while the
 * request is in flight, and when the real result lands the remaining stages
 * play through with the actual numbers. Nothing saves until the review
 * screen's save button.
 */

import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, SaveBar, TopBar } from '../components/Chrome'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { mmss } from '../lib/format'
import type { ParseVideoResult } from '../lib/types'

type Stage = 'idle' | 'parsing' | 'done' | 'error'

export function PasteLink() {
  const navigate = useNavigate()
  const { getProfileJwt } = useLocalFirstAuth()
  const [url, setUrl] = useState('')
  const [stage, setStage] = useState<Stage>('idle')
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<ParseVideoResult | null>(null)
  const [revealed, setRevealed] = useState(0) // stages shown as done once result lands
  const timerRef = useRef<ReturnType<typeof setInterval>>(undefined)

  useEffect(() => () => clearInterval(timerRef.current), [])

  const start = async () => {
    if (!url.trim() || stage === 'parsing') return
    setStage('parsing')
    setError(null)
    setResult(null)
    setRevealed(0)
    try {
      const parsed = await api.parseVideo(getProfileJwt, url)
      setResult(parsed)
      // Play the remaining stages through on a short cadence
      let n = 1
      setRevealed(1)
      timerRef.current = setInterval(() => {
        n += 1
        setRevealed(n)
        if (n >= 4) {
          clearInterval(timerRef.current)
          setStage('done')
        }
      }, 550)
    } catch (err) {
      setStage('error')
      setError(err instanceof Error ? err.message : 'Could not read that video')
    }
  }

  const stages: Array<{ label: React.ReactNode; state: 'done' | 'now' | 'wait' }> = [
    {
      label: result
        ? `Found the video — ${result.video.author}${result.video.durationSeconds ? `, ${mmss(result.video.durationSeconds)}` : ''}`
        : 'Finding the video',
      state: result && revealed >= 1 ? 'done' : stage === 'parsing' ? 'now' : 'wait',
    },
    {
      label: result && revealed >= 2 ? `Pulled ${result.parse.stats.ingredientCount} ingredients out of the transcript` : 'Pulling ingredients out of the transcript',
      state: result && revealed >= 2 ? 'done' : result && revealed >= 1 ? 'now' : 'wait',
    },
    {
      label:
        result && revealed >= 3
          ? `Cut ${result.parse.stats.spokenSteps} spoken steps down to ${result.parse.stats.cardCount} cards`
          : 'Cutting the spoken steps down to cards',
      state: result && revealed >= 3 ? 'done' : result && revealed >= 2 ? 'now' : 'wait',
    },
    {
      label:
        result && revealed >= 4
          ? result.parse.stats.overLimit > 0
            ? `${result.parse.stats.overLimit} card${result.parse.stats.overLimit === 1 ? '' : 's'} over 140 — you'll trim them next`
            : 'Every card fits 140 characters'
          : 'Checking each card fits 140 characters',
      state: result && revealed >= 4 ? 'done' : result && revealed >= 3 ? 'now' : 'wait',
    },
  ]

  const mk = { done: <span className="text-herb">&#10003;</span>, now: <span className="text-yolk">&rarr;</span>, wait: <span>&middot;</span> }

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TopBar left={<BackButton to="/" label="Cancel" />} right={<span className="eyebrow">Step 1 of 2</span>} />
        <div className="px-5 pb-8">
          <h1 className="h-display text-[clamp(34px,10vw,42px)]">Where's it&nbsp;from?</h1>

          <div className="bigfield mt-5">
            <label className="block font-mono2 text-[10.5px] tracking-[0.14em] uppercase text-muted mb-2.5" htmlFor="video-url">
              Video link
            </label>
            <div className="flex gap-2 items-center">
              <input
                id="video-url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && start()}
                placeholder="https://www.youtube.com/watch?v=…"
                inputMode="url"
                autoComplete="off"
                className="flex-1 min-w-0 bg-transparent border-b-2 border-ink pb-2 font-mono2 text-[13.5px] outline-none placeholder:text-rule"
              />
              <button
                type="button"
                onClick={start}
                disabled={stage === 'parsing' || !url.trim()}
                className="font-mono2 text-[11px] tracking-[0.1em] uppercase bg-ink text-kraft px-3 py-2 disabled:opacity-45"
              >
                {stage === 'parsing' ? 'Reading…' : 'Read it'}
              </button>
            </div>
            {stage === 'parsing' && (
              <div className="mt-4 flex gap-[11px] items-center">
                <div className="flex-1 h-2 bg-kraft-deep relative overflow-hidden">
                  <div className="absolute inset-0 right-[42%] stripe-bar animate-pulse" />
                </div>
                <em className="font-mono2 not-italic text-[11px] text-muted tracking-[0.04em]">Reading transcript</em>
              </div>
            )}
          </div>

          {(stage === 'parsing' || result) && (
            <ul className="list-none mt-[22px] m-0 p-0">
              {stages.map((s, i) => (
                <li
                  key={i}
                  className={`flex gap-[11px] items-center py-[11px] border-b border-rule text-[15px] ${
                    s.state === 'wait' ? 'text-muted' : s.state === 'now' ? 'font-medium' : ''
                  }`}
                >
                  <span className="font-mono2 text-[12px] w-4 flex-none">{mk[s.state]}</span>
                  {s.label}
                </li>
              ))}
            </ul>
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
      {stage === 'done' && result && (
        <SaveBar label="Review the breakdown" onClick={() => navigate('/add/review', { state: result })} />
      )}
    </section>
  )
}
