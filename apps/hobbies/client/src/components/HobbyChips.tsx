import { useState } from 'react'
import { HOBBY_HUES, hueFor, nextFreeHueIndex } from '../lib/hues'
import type { Hobby, HobbyKind } from '../lib/types'
import { useHobbyData } from '../hooks/useHobbyData'
import { useToast } from './Toast'

interface HobbyChipsProps {
  activeHobbyId: string | null
  /** Hobby ids with a session logged today (shown ticked). */
  doneToday: Set<string>
  onToggle: (hobby: Hobby) => void
}

export function HobbyChips({ activeHobbyId, doneToday, onToggle }: HobbyChipsProps) {
  const { hobbies } = useHobbyData()
  const [adding, setAdding] = useState(false)

  return (
    <div className="mt-[14px]">
      <div className="flex flex-wrap gap-[10px]">
        {hobbies.map((hobby) => {
          const selected = activeHobbyId === hobby.id || doneToday.has(hobby.id)
          return (
            <button
              key={hobby.id}
              className="chip"
              style={{ '--dot': hueFor(hobby) } as React.CSSProperties}
              aria-pressed={selected}
              onClick={() => onToggle(hobby)}
            >
              <span className="chip-dot" />
              {hobby.name}
              {selected && <span className="text-[13px] text-select">✓</span>}
            </button>
          )
        })}
        <button className="chip chip-ghost" onClick={() => setAdding((v) => !v)}>
          {adding ? '× Cancel' : '+ Add hobby'}
        </button>
      </div>
      {adding && <AddHobbyForm onDone={() => setAdding(false)} />}
    </div>
  )
}

function AddHobbyForm({ onDone }: { onDone: () => void }) {
  const { hobbies, addHobby } = useHobbyData()
  const showToast = useToast()
  const [name, setName] = useState('')
  const [kind, setKind] = useState<HobbyKind>('learn')
  const [hueIndex, setHueIndex] = useState(() => nextFreeHueIndex(hobbies))
  const [saving, setSaving] = useState(false)

  const save = async () => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      const hobby = await addHobby(name.trim(), kind, hueIndex)
      showToast(`${hobby.name} added`)
      onDone()
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not add hobby')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="card mt-[14px] rise flex flex-col gap-3">
      <input
        className="field"
        placeholder="Hobby name"
        value={name}
        maxLength={40}
        autoFocus
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && void save()}
      />
      <div className="flex gap-2">
        {(
          [
            ['learn', 'Learning', 'pieces carry lesson links'],
            ['craft', 'Making', 'prompts, muse & photos'],
          ] as const
        ).map(([value, label, hint]) => (
          <button
            key={value}
            className="chip chip-small flex-1 flex-col !items-start !gap-0"
            aria-pressed={kind === value}
            onClick={() => setKind(value)}
          >
            <span>{label}</span>
            <span className="text-[11.5px] font-normal text-muted">{hint}</span>
          </button>
        ))}
      </div>
      <div className="flex gap-2 flex-wrap">
        {HOBBY_HUES.map((hex, i) => (
          <button
            key={hex}
            aria-label={`Color ${i + 1}`}
            aria-pressed={hueIndex === i}
            className="w-7 h-7 rounded-full border-2"
            style={{
              background: hex,
              borderColor: hueIndex === i ? 'var(--color-ink)' : 'transparent',
            }}
            onClick={() => setHueIndex(i)}
          />
        ))}
      </div>
      <button className="btn-log" disabled={!name.trim() || saving} onClick={() => void save()}>
        {saving ? 'Adding…' : 'Add hobby'}
      </button>
    </div>
  )
}
