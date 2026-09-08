import { useMemo, useState } from 'react'
import { Heatmap } from '../components/Heatmap'
import { HobbyChips } from '../components/HobbyChips'
import { MuseSection } from '../components/MuseSection'
import { PhotoAttach } from '../components/PhotoAttach'
import { PiecePicker } from '../components/PiecePicker'
import { useToast } from '../components/Toast'
import { useHobbyData } from '../hooks/useHobbyData'
import { eyebrowDate, formatWhen, fromKey, todayKey } from '../lib/dates'
import { hueFor } from '../lib/hues'
import type { Hobby } from '../lib/types'

export function Today() {
  const { hobbies, heatmap, journal, loading, error, refetch, logSession } = useHobbyData()
  const showToast = useToast()
  const [activeHobby, setActiveHobby] = useState<Hobby | null>(null)
  const [selectedPieceId, setSelectedPieceId] = useState<string | null>(null)
  const [photoId, setPhotoId] = useState<string | null>(null)
  const [popSignal, setPopSignal] = useState(0)
  const [logging, setLogging] = useState(false)

  const today = todayKey()
  // The day the log flow writes to: today, or a past tile tapped on the grid
  const [selectedDate, setSelectedDate] = useState(today)
  const isToday = selectedDate === today
  const doneOnDay = useMemo(
    () => new Set(journal.filter((s) => s.date === selectedDate).map((s) => s.hobbyId)),
    [journal, selectedDate],
  )

  const resetPick = () => {
    setActiveHobby(null)
    setSelectedPieceId(null)
    setPhotoId(null)
  }

  const toggleHobby = (hobby: Hobby) => {
    const closing = activeHobby?.id === hobby.id
    setActiveHobby(closing ? null : hobby)
    setSelectedPieceId(null)
    setPhotoId(null)
  }

  const selectDay = (date: string) => {
    // Tapping the selected tile again returns to today
    const next = date === selectedDate ? today : date
    if (next === selectedDate) return
    setSelectedDate(next)
    resetPick()
  }

  const log = async () => {
    if (!activeHobby || logging) return
    setLogging(true)
    try {
      const session = await logSession(activeHobby.id, selectedPieceId, photoId ?? undefined, selectedDate)
      setPopSignal((n) => n + 1)
      resetPick()
      const when = isToday ? "today's tile just lit up" : formatWhen(session.date)
      showToast(session.pieceName ? `Logged ✓ — ${session.pieceName}` : `Logged ✓ — ${when}`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not log it')
    } finally {
      setLogging(false)
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-[10px] pt-8">
        <div className="shimmer" />
        <div className="shimmer" />
        <div className="shimmer" />
      </div>
    )
  }
  if (error) {
    return (
      <div className="text-center pt-12">
        <p className="text-ink-soft">{error}</p>
        <button className="btn-log mt-4 !w-auto px-6" onClick={() => void refetch()}>
          Try again
        </button>
      </div>
    )
  }

  return (
    <section className="rise">
      <div className="eyebrow">{eyebrowDate()}</div>
      <h1 className="display-title mt-[6px]">Twelve weeks of making</h1>

      <Heatmap
        heatmap={heatmap}
        hobbies={hobbies}
        today={today}
        selectedDate={selectedDate}
        onSelectDay={selectDay}
        popSignal={popSignal}
      />

      <div className="section-label">
        <span className="eyebrow">{isToday ? 'Today' : eyebrowDate(fromKey(selectedDate))}</span>
      </div>
      <div className="flex items-baseline justify-between gap-3 -mt-1">
        <h2 className="font-display font-semibold text-[21px] tracking-[-0.01em]">
          {isToday ? 'What did you do?' : 'What did you do that day?'}
        </h2>
        {!isToday && (
          <button
            type="button"
            className="shrink-0 text-[13px] text-ink-soft underline underline-offset-2 hover:text-ink"
            onClick={() => selectDay(today)}
          >
            ← Back to today
          </button>
        )}
      </div>

      <HobbyChips activeHobbyId={activeHobby?.id ?? null} doneOnDay={doneOnDay} onToggle={toggleHobby} />

      {activeHobby && (
        <div
          className="mt-4 border-t border-dashed border-line-strong pt-4 rise"
          style={{ '--dot': hueFor(activeHobby) } as React.CSSProperties}
        >
          <h3 className="text-[14px] font-semibold text-ink-soft mb-[10px]">
            {activeHobby.kind === 'craft' ? (
              'What did you make?'
            ) : (
              <>
                What did you work on in <b className="text-ink">{activeHobby.name}</b>?
              </>
            )}
          </h3>
          <PiecePicker
            // Remount per hobby so add/edit mode never leaks across a chip switch
            key={activeHobby.id}
            hobby={activeHobby}
            selectedPieceId={selectedPieceId}
            onSelect={setSelectedPieceId}
          />
          {activeHobby.kind === 'craft' && (
            <>
              <MuseSection hobby={activeHobby} onPieceCreated={(piece) => setSelectedPieceId(piece.id)} />
              <PhotoAttach photoId={photoId} onChange={setPhotoId} />
            </>
          )}
          <button className="btn-log mt-4" disabled={logging} onClick={() => void log()}>
            {logging ? 'Logging…' : 'Log it'}
          </button>
        </div>
      )}

      <p className="text-[13px] text-muted mt-[14px]">
        Tap a hobby to log it — or tap a past tile above to log a day you missed.
      </p>
    </section>
  )
}
