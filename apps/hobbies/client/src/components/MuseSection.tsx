import { useState } from 'react'
import { hueFor } from '../lib/hues'
import type { Hobby, MuseIdea, Piece } from '../lib/types'
import { useHobbyData } from '../hooks/useHobbyData'
import { useToast } from './Toast'

interface MuseSectionProps {
  hobby: Hobby
  /** Called when an idea is accepted and saved as a piece — select it. */
  onPieceCreated: (piece: Piece) => void
}

/**
 * The AI muse, living exactly where the blank-page problem strikes: inside a
 * craft hobby's picker. Button → shimmer (the OpenAI round-trip) → three
 * {title, why} cards → "Make this today" saves the idea as a piece.
 */
export function MuseSection({ hobby, onPieceCreated }: MuseSectionProps) {
  const { summonMuse, addPiece } = useHobbyData()
  const showToast = useToast()
  const [ideas, setIdeas] = useState<MuseIdea[]>([])
  const [loading, setLoading] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const hue = hueFor(hobby)

  const summon = async () => {
    setLoading(true)
    try {
      const shown = ideas.map((i) => i.title)
      const result = await summonMuse(hobby.id, shown)
      setIdeas(result.ideas)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'The muse is unavailable')
    } finally {
      setLoading(false)
    }
  }

  const accept = async (idea: MuseIdea) => {
    if (accepting) return
    setAccepting(true)
    try {
      const piece = await addPiece(hobby.id, idea.title, [], 'muse')
      setIdeas([])
      onPieceCreated(piece)
      showToast(`“${piece.name}” is today's piece`)
    } catch (e) {
      showToast(e instanceof Error ? e.message : 'Could not save the idea')
    } finally {
      setAccepting(false)
    }
  }

  return (
    <div
      className="mt-4 border-t border-dashed border-line-strong pt-[14px]"
      style={{ '--dot': hue } as React.CSSProperties}
    >
      {ideas.length === 0 && !loading && (
        <>
          <button className="muse-btn" onClick={() => void summon()}>
            <span className="text-[15px]" style={{ color: hue }}>✦</span>
            Not sure what to make? Ask the muse
          </button>
          <span className="block mt-2 text-[12.5px] text-muted">
            Three prompts, generated fresh — pick one or shuffle again.
          </span>
        </>
      )}
      {loading && (
        <div className="flex flex-col gap-[10px]">
          <div className="shimmer" />
          <div className="shimmer" />
          <div className="shimmer" />
        </div>
      )}
      {!loading && ideas.length > 0 && (
        <>
          <div className="flex flex-col gap-[10px]">
            {ideas.map((idea, i) => (
              <div key={idea.title} className="muse-card" style={{ animationDelay: `${i * 0.07}s` }}>
                <p className="text-[14.5px] leading-[1.45]">
                  <b className="font-display font-semibold">{idea.title}.</b> {idea.why}
                </p>
                <div className="flex gap-2 mt-[10px]">
                  <button
                    className="px-[13px] py-[6px] text-[12.5px] font-semibold rounded-full bg-ink text-paper border border-ink"
                    disabled={accepting}
                    onClick={() => void accept(idea)}
                  >
                    Make this today
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button
            className="mt-3 font-mono text-[12px] font-semibold tracking-[0.14em] uppercase"
            style={{ color: hue }}
            onClick={() => void summon()}
          >
            ⟲ Shuffle three more
          </button>
        </>
      )}
    </div>
  )
}
