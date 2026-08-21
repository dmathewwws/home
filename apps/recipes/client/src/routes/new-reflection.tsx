/**
 * "How did it go?" — log a cook. Photo, which recipe (searchable), the
 * three-way verdict, two pads (free-form "What happened", one-thing "Change
 * next time"), time stepper, and the rep line with its fresh yolk stroke.
 */

import { useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { BackButton, SaveBar, TopBar } from '../components/Chrome'
import { PhotoCapture } from '../components/PhotoCapture'
import { RecipeThumb } from '../components/RecipeThumb'
import { TallyMarks } from '../components/TallyMarks'
import { useRecipes } from '../hooks/useAppData'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { dayMonth, seedFromId } from '../lib/format'
import type { Verdict } from '../lib/types'

const VERDICTS: Array<{ key: Verdict; label: string; pressedClass: string }> = [
  { key: 'keeper', label: 'Keeper', pressedClass: 'bg-yolk !border-yolk !text-ink' },
  { key: 'another-go', label: 'Another go', pressedClass: 'bg-[#9C3B1418] !border-sear !text-sear' },
  { key: 'never-again', label: 'Never again', pressedClass: '!border-ink !text-ink' },
]

export function NewReflection() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { getProfileJwt } = useLocalFirstAuth()
  const { recipes } = useRecipes()

  const [recipeId, setRecipeId] = useState<string | null>(searchParams.get('recipeId'))
  const [picking, setPicking] = useState(false)
  const [pickQuery, setPickQuery] = useState('')
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [variation, setVariation] = useState<string | null>(null)
  const [verdict, setVerdict] = useState<Verdict | null>(null)
  const [note, setNote] = useState('')
  const [changeNextTime, setChangeNextTime] = useState('')
  const [minutes, setMinutes] = useState(30)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const recipe = useMemo(() => recipes?.find((r) => r.id === recipeId) ?? null, [recipes, recipeId])
  const pickable = useMemo(() => {
    if (!recipes) return []
    const q = pickQuery.trim().toLowerCase()
    return q ? recipes.filter((r) => r.title.toLowerCase().includes(q)) : recipes
  }, [recipes, pickQuery])

  const canSave = !!recipe && !!verdict && !saving

  const save = async () => {
    if (!recipe || !verdict) return
    setSaving(true)
    setError(null)
    try {
      await api.createReflection(getProfileJwt, {
        recipeId: recipe.id,
        verdict,
        note: note.trim() || null,
        changeNextTime: changeNextTime.trim() || null,
        variation,
        minutes,
        photoId,
      })
      navigate('/reflections', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TopBar left={<BackButton to="/reflections" label="Cancel" />} right={<span className="eyebrow">{today}</span>} />
        <div className="page-col px-5 pb-8">
          <h1 className="h-display text-[clamp(34px,10vw,42px)]">How did it&nbsp;go?</h1>

          <div className="mt-5">
            <PhotoCapture photoId={photoId} onChange={setPhotoId} />
          </div>

          {/* Which recipe */}
          {recipe && !picking ? (
            <div className="flex items-center gap-[13px] border border-ink bg-[#00000006] p-3 mt-5">
              <RecipeThumb id={recipe.id} thumbUrl={recipe.thumbUrl} title={recipe.title} className="w-[46px] h-[46px]" />
              <div className="flex-1 min-w-0">
                <b className="font-display font-semibold text-[16px] block tracking-[-0.01em] leading-[1.15]">{recipe.title}</b>
                <em className="font-mono2 not-italic text-[10px] tracking-[0.1em] uppercase text-muted block mt-[5px]">
                  {recipe.lastCookedAt ? `Last cooked ${dayMonth(recipe.lastCookedAt)}` : 'Never cooked'}
                </em>
              </div>
              <button type="button" className="mono-link flex-none !text-[10px]" onClick={() => setPicking(true)}>
                Change
              </button>
            </div>
          ) : (
            <div className="border border-ink bg-[#00000006] p-3 mt-5">
              <input
                autoFocus={picking}
                value={pickQuery}
                onChange={(e) => setPickQuery(e.target.value)}
                placeholder="Which recipe was it?"
                className="w-full bg-transparent font-mono2 text-[13px] outline-none placeholder:text-muted"
              />
              <div className="mt-2 max-h-52 overflow-y-auto">
                {pickable.map((r) => (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => {
                      setRecipeId(r.id)
                      setVariation(null)
                      setPicking(false)
                      setPickQuery('')
                    }}
                    className="flex items-center gap-2.5 w-full text-left py-2 border-t border-rule first:border-t-0"
                  >
                    <RecipeThumb id={r.id} thumbUrl={r.thumbUrl} title={r.title} className="w-[32px] h-[32px]" />
                    <span className="font-display font-semibold text-[14px] flex-1">{r.title}</span>
                    {r.timesCooked > 0 && <TallyMarks count={r.timesCooked} seed={seedFromId(r.id)} className="text-muted" />}
                  </button>
                ))}
                {pickable.length === 0 && <p className="text-[13px] text-muted py-2">Nothing in the box matches.</p>}
              </div>
            </div>
          )}

          {recipe && recipe.variations.length > 0 && (
            <div className="my-[26px]">
              <span className="tape mb-3.5">Which version?</span>
              <div className="flex flex-wrap gap-[9px] mt-2">
                {recipe.variations.map((v) => (
                  <button
                    key={v.name}
                    type="button"
                    aria-pressed={variation === v.name}
                    onClick={() => setVariation(variation === v.name ? null : v.name)}
                    className="chip aria-pressed:bg-ink aria-pressed:!text-kraft aria-pressed:!border-ink"
                  >
                    {v.name}
                  </button>
                ))}
              </div>
              <p className="text-[14px] text-muted leading-normal mt-2">Leave them all off if it was just the base.</p>
            </div>
          )}

          <div className="my-[26px]">
            <span className="tape mb-3.5">The verdict</span>
            <div className="flex gap-[9px] mt-2">
              {VERDICTS.map((v) => (
                <button
                  key={v.key}
                  type="button"
                  aria-pressed={verdict === v.key}
                  onClick={() => setVerdict(v.key)}
                  className={`flex-1 border-[1.5px] border-rule py-[13px] px-1.5 font-mono2 text-[10.5px] tracking-[0.11em] uppercase text-muted ${
                    verdict === v.key ? v.pressedClass : ''
                  }`}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">What happened</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="Write it while the pan's still hot."
              className="w-full border border-rule bg-kraft-lift p-3.5 mt-2 min-h-[112px] text-[16px] leading-[1.45] font-body outline-none placeholder:text-rule resize-none"
            />
            <p className="text-[14px] text-muted leading-normal mt-1">This is what you'll read next time.</p>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Change next time</span>
            <textarea
              value={changeNextTime}
              onChange={(e) => setChangeNextTime(e.target.value)}
              rows={2}
              placeholder="One thing. Leave it blank if nothing."
              className="w-full border border-rule bg-kraft-lift p-3.5 mt-2 min-h-[74px] text-[16px] leading-[1.45] font-body outline-none placeholder:text-rule resize-none"
            />
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Details</span>
            <div className="flex items-center gap-3.5 border border-rule px-[13px] py-[11px] mt-2">
              <span className="font-mono2 text-[10.5px] tracking-[0.13em] uppercase text-muted flex-1">Time at the stove</span>
              <button type="button" aria-label="Less" onClick={() => setMinutes((v) => Math.max(5, v - 5))} className="w-[30px] h-[30px] border border-ink font-mono2 text-[15px] grid place-items-center">
                &minus;
              </button>
              <span className="font-mono2 text-[14px] min-w-[52px] text-center">{minutes} min</span>
              <button type="button" aria-label="More" onClick={() => setMinutes((v) => Math.min(600, v + 5))} className="w-[30px] h-[30px] border border-ink font-mono2 text-[15px] grid place-items-center">
                +
              </button>
            </div>
            {recipe && (
              <div className="flex items-center gap-2.5 mt-4 pt-3.5 border-t border-rule">
                <span className="font-mono2 text-[10.5px] tracking-[0.13em] uppercase text-muted">This makes it rep</span>
                {recipe.timesCooked > 0 && (
                  <TallyMarks count={recipe.timesCooked} seed={seedFromId(recipe.id)} className="text-ink" />
                )}
                <TallyMarks count={1} seed={seedFromId(recipe.id) + recipe.timesCooked} className="text-yolk" />
                <span className="font-mono2 text-[10.5px] tracking-[0.13em] uppercase text-muted ml-auto">
                  {recipe.timesCooked + 1} total
                </span>
              </div>
            )}
          </div>

          {error && <p className="text-sear text-[14px] mb-4">{error}</p>}
        </div>
      </div>
      <SaveBar label={saving ? 'Saving…' : 'Save to Reflections'} onClick={save} disabled={!canSave} />
    </section>
  )
}
