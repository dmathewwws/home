import { useMemo } from 'react'
import { AdminSection } from '../components/AdminSection'
import { EntryRow } from '../components/EntryRow'
import { useHobbyData } from '../hooks/useHobbyData'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'

export function Logs() {
  const { user, getProfileJwt } = useLocalFirstAuth()
  const { hobbies, journal, loading, error, refetch } = useHobbyData()
  const hobbyById = useMemo(() => new Map(hobbies.map((h) => [h.id, h])), [hobbies])

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
      <div className="eyebrow">Journal</div>
      <h1 className="display-title mt-[6px]">Every entry</h1>

      <div className="flex flex-col gap-[10px] mt-[18px]">
        {journal.length === 0 ? (
          <p className="text-[14px] text-muted">
            Nothing logged yet — head to Today and tap a hobby.
          </p>
        ) : (
          journal.map((entry) => (
            <EntryRow key={entry.id} entry={entry} hobby={hobbyById.get(entry.hobbyId)} />
          ))
        )}
      </div>

      {user?.isAdmin && (
        <div className="mt-8">
          <AdminSection getProfileJwt={getProfileJwt} onReset={() => {}} />
        </div>
      )}
    </section>
  )
}
