import { useMemo, useState } from 'react'
import { Heatmap } from '../components/Heatmap'
import { HobbyChips } from '../components/HobbyChips'
import { MuseSection } from '../components/MuseSection'
import { PhotoAttach } from '../components/PhotoAttach'
import { PiecePicker } from '../components/PiecePicker'
import { useToast } from '../components/Toast'
import { useHobbyData } from '../hooks/useHobbyData'
import { eyebrowDate, todayKey } from '../lib/dates'
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
  const doneToday = useMemo(
    () => new Set(journal.filter((s) => s.date === today).map((s) => s.hobbyId)),
    [journal, today],
  )

  const toggleHobby = (hobby: Hobby) => {
    const closing = activeHobby?.id === hobby.id
    setActiveHobby(closing ? null : hobby)
    setSelectedPieceId(null)
    setPhotoId(null)
  }

  const log = async () => {
    if (!activeHobby || logging) return
    setLogging(true)
    try {
      const session = await logSession(activeHobby.id, selectedPieceId, photoId ?? undefined)
      setPopSignal((n) => n + 1)
      setActiveHobby(null)
      setSelectedPieceId(null)
      setPhotoId(null)
      showToast(session.pieceName ? `Logged ✓ — ${session.pieceName}` : "Logged ✓ — today's tile just lit up")
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

      <Heatmap heatmap={heatmap} hobbies={hobbies} today={today} popSignal={popSignal} />

      <div className="section-label">
        <span className="eyebrow">Today</span>
      </div>
      <h2 className="font-display font-semibold text-[21px] tracking-[-0.01em] -mt-1">
        What did you do?
      </h2>

      <HobbyChips activeHobbyId={activeHobby?.id ?? null} doneToday={doneToday} onToggle={toggleHobby} />

      {activeHobby && (
        <div
          className="mt-4 border-t border-dashed border-line-strong pt-4 rise"
          style={{ '--dot': hueFor(activeHobby) } as React.CSSProperties}
        >
          <h3 className="text-[14px] font-semibold text-ink-soft mb-[10px]">
            {activeHobby.kind === 'craft' ? (
              'What did you draw?'
            ) : (
              <>
                What did you work on in <b className="text-ink">{activeHobby.name}</b>?
              </>
            )}
          </h3>
          <PiecePicker
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
        Tap a hobby to log it — today's tile lights up on the grid above.
      </p>
    </section>
  )
}
