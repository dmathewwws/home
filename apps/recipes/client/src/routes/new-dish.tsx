/**
 * "What did you eat?" — log a dish from a restaurant or fast-food place.
 * Only the name is required; place, photo and note are all optional.
 */

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BackButton, SaveBar, TopBar } from '../components/Chrome'
import { PhotoCapture } from '../components/PhotoCapture'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'

export function NewDish() {
  const navigate = useNavigate()
  const { getProfileJwt } = useLocalFirstAuth()

  const [name, setName] = useState('')
  const [place, setPlace] = useState('')
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canSave = !!name.trim() && !saving

  const save = async () => {
    if (!name.trim()) return
    setSaving(true)
    setError(null)
    try {
      await api.createDish(getProfileJwt, {
        name: name.trim(),
        place: place.trim() || null,
        note: note.trim() || null,
        photoId,
      })
      navigate('/eating-out', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
      setSaving(false)
    }
  }

  const today = new Date().toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <section className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        <TopBar left={<BackButton to="/eating-out" label="Cancel" />} right={<span className="eyebrow">{today}</span>} />
        <div className="page-col px-5 pb-8">
          <h1 className="h-display text-[clamp(34px,10vw,42px)]">What did you&nbsp;eat?</h1>

          <div className="my-[26px]">
            <span className="tape mb-3.5">The dish</span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Spicy chicken sandwich"
              className="write outline-none"
            />
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Where</span>
            <input
              value={place}
              onChange={(e) => setPlace(e.target.value)}
              placeholder="Which spot? Skip it if you like."
              className="w-full border border-rule bg-kraft-lift p-3.5 mt-2 text-[16px] leading-[1.45] font-body outline-none placeholder:text-rule"
            />
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Photo</span>
            <div className="mt-2">
              <PhotoCapture photoId={photoId} onChange={setPhotoId} />
            </div>
          </div>

          <div className="my-[26px]">
            <span className="tape mb-3.5">Worth remembering</span>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={4}
              placeholder="What made it good? What would you order next time?"
              className="w-full border border-rule bg-kraft-lift p-3.5 mt-2 min-h-[112px] text-[16px] leading-[1.45] font-body outline-none placeholder:text-rule resize-none"
            />
          </div>

          {error && <p className="text-sear text-[14px] mb-4">{error}</p>}
        </div>
      </div>
      <SaveBar label={saving ? 'Saving…' : 'Save to Eating out'} onClick={save} disabled={!canSave} />
    </section>
  )
}
