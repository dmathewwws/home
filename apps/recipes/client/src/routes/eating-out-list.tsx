/**
 * Eating out — the restaurant/fast-food journal. A flat stream of logged
 * dishes, newest first. Only the dish name is guaranteed; place, photo and
 * note render when present. Delete is a two-tap inline confirm (no native
 * dialog) on your own entries (admins can delete any).
 */

import { useState } from 'react'
import { NavPills, TopBar } from '../components/Chrome'
import { useDishes } from '../hooks/useAppData'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import * as api from '../lib/api'
import { imgUrl } from '../lib/api'
import { shortDate } from '../lib/format'
import type { DishListItem } from '../lib/types'

function Entry({
  dish,
  canDelete,
  onDelete,
}: {
  dish: DishListItem
  canDelete: boolean
  onDelete: () => Promise<void>
}) {
  const [confirming, setConfirming] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      await onDelete()
    } catch {
      setDeleting(false)
      setConfirming(false)
    }
  }

  return (
    <article className="py-[22px] border-t border-rule first:border-t-0">
      <div className="eyebrow flex gap-2.5 items-center">
        {shortDate(dish.createdAt)}
        {dish.authorName ? <> &middot; {dish.authorName}</> : null}
        <span className="flex-1 h-px bg-rule opacity-60" />
        {canDelete &&
          (confirming ? (
            <span className="flex gap-2.5">
              <button type="button" className="mono-link !text-[10px] text-sear" onClick={handleDelete} disabled={deleting}>
                {deleting ? 'Deleting…' : 'Sure?'}
              </button>
              <button type="button" className="mono-link !text-[10px]" onClick={() => setConfirming(false)} disabled={deleting}>
                Keep
              </button>
            </span>
          ) : (
            <button type="button" className="mono-link !text-[10px]" onClick={() => setConfirming(true)}>
              Delete
            </button>
          ))}
      </div>
      {dish.photoId && (
        <div className="mt-3 bg-kraft-deep border border-rule aspect-[4/3] overflow-hidden">
          <img
            src={imgUrl(dish.photoId, 'thumb')}
            alt={`Photo of ${dish.name}`}
            className="block w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <h3 className="font-display font-extrabold text-[20px] tracking-[-0.01em] mt-3.5 mb-1.5">{dish.name}</h3>
      {dish.place && (
        <p className="font-mono2 text-[10.5px] tracking-[0.1em] uppercase text-muted mb-1.5">{dish.place}</p>
      )}
      {dish.note && <p className="text-[15.5px] leading-normal">{dish.note}</p>}
    </article>
  )
}

export function EatingOutList() {
  const { dishes, error, loading } = useDishes()
  const { user, getProfileJwt } = useLocalFirstAuth()

  return (
    <section className="flex-1 flex flex-col">
      <TopBar
        home
        left={<h1 className="h-display text-[clamp(34px,10vw,42px)]">Eating out</h1>}
        right={<NavPills />}
      />
      <div className="page-col px-5 pb-[108px]">
        {error && <p className="text-sear text-[14px]">{error}</p>}
        {!error && !loading && (dishes?.length ?? 0) === 0 && (
          <div className="bigfield mt-2">
            <p className="text-[15px] text-muted leading-normal">
              Nothing logged yet. Next time a dish out is worth remembering, hit the yellow button before the plate's cleared.
            </p>
          </div>
        )}
        {dishes?.map((dish) => (
          <Entry
            key={dish.id}
            dish={dish}
            canDelete={!!user && (user.isAdmin || user.did === dish.createdBy)}
            onDelete={() => api.deleteDish(getProfileJwt, dish.id).then(() => undefined)}
          />
        ))}
      </div>
    </section>
  )
}
