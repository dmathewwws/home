import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { NavPills, TopBar } from '../components/Chrome'
import { FilterChips } from '../components/FilterChips'
import { TallyMarks } from '../components/TallyMarks'
import { useReflections } from '../hooks/useAppData'
import { imgUrl } from '../lib/api'
import { seedFromId, shortDate } from '../lib/format'
import type { ReflectionListItem, Verdict } from '../lib/types'

type FilterKey = 'all' | 'keepers' | 'another-go' | 'never-again'

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'Everything' },
  { key: 'keepers', label: 'Keepers' },
  { key: 'another-go', label: 'Needs another go' },
  { key: 'never-again', label: 'Never again' },
]

const VERDICT_LABEL: Record<Verdict, string> = {
  keeper: 'Keeper',
  'another-go': 'Another go',
  'never-again': 'Never again',
}

const VERDICT_CLASS: Record<Verdict, string> = {
  keeper: 'verdict verdict-keep',
  'another-go': 'verdict verdict-again',
  'never-again': 'verdict',
}

function Entry({ reflection }: { reflection: ReflectionListItem }) {
  return (
    <article className="py-[22px] border-t border-rule first:border-t-0">
      <div className="eyebrow flex gap-2.5 items-center">
        {shortDate(reflection.cookedAt)} &middot; rep {reflection.rep}
        {reflection.authorName ? <> &middot; {reflection.authorName}</> : null}
        <span className="flex-1 h-px bg-rule opacity-60" />
      </div>
      {reflection.photoId && (
        <div className="mt-3 bg-kraft-deep border border-rule aspect-[4/3] overflow-hidden">
          <img
            src={imgUrl(reflection.photoId, 'thumb')}
            alt={`Photo of ${reflection.recipeTitle}`}
            className="block w-full h-full object-cover"
            loading="lazy"
          />
        </div>
      )}
      <h3 className="font-display font-extrabold text-[20px] tracking-[-0.01em] mt-3.5 mb-1.5">
        {reflection.recipeId ? (
          <Link to={`/recipe/${reflection.recipeId}`}>{reflection.recipeTitle}</Link>
        ) : (
          reflection.recipeTitle
        )}
      </h3>
      {reflection.note && <p className="text-[15.5px] leading-normal">{reflection.note}</p>}
      {reflection.changeNextTime && (
        <p className="text-[14.5px] leading-normal mt-1.5 text-muted">
          <span className="font-mono2 text-[10px] tracking-[0.12em] uppercase text-sear">Next time&nbsp;</span>
          {reflection.changeNextTime}
        </p>
      )}
      <div className="flex items-center gap-3 mt-[13px]">
        <span className={VERDICT_CLASS[reflection.verdict]}>{VERDICT_LABEL[reflection.verdict]}</span>
        <TallyMarks count={reflection.rep} seed={seedFromId(reflection.id)} className="text-ink" />
        {reflection.minutes != null && (
          <span className="font-mono2 text-[10.5px] tracking-[0.1em] uppercase text-muted ml-auto">
            {reflection.minutes} min
          </span>
        )}
      </div>
    </article>
  )
}

export function ReflectionsList() {
  const { reflections, error, loading } = useReflections()
  const [filter, setFilter] = useState<FilterKey>('all')

  const filtered = useMemo(() => {
    if (!reflections) return []
    if (filter === 'all') return reflections
    if (filter === 'keepers') return reflections.filter((r) => r.verdict === 'keeper')
    return reflections.filter((r) => r.verdict === filter)
  }, [reflections, filter])

  return (
    <section className="flex-1 flex flex-col">
      <TopBar
        left={<h1 className="h-display text-[clamp(34px,10vw,42px)]">Reflections</h1>}
        right={<NavPills />}
      />
      <div className="page-col px-5 pb-[108px]">
        <FilterChips options={FILTERS} active={filter} onChange={setFilter} className="pt-1.5" />
        {error && <p className="text-sear text-[14px]">{error}</p>}
        {!error && !loading && filtered.length === 0 && (
          <div className="bigfield mt-2">
            <p className="text-[15px] text-muted leading-normal">
              {filter === 'all'
                ? "Nothing logged yet. Cook something, then hit the yellow button while the pan's still hot."
                : 'No entries with that verdict yet.'}
            </p>
          </div>
        )}
        {filtered.map((reflection) => (
          <Entry key={reflection.id} reflection={reflection} />
        ))}
      </div>
    </section>
  )
}
