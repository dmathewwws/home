import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TopBar } from '../components/Chrome'
import { FilterChips } from '../components/FilterChips'
import { IngChip } from '../components/IngChip'
import { RecipeThumb } from '../components/RecipeThumb'
import { SearchBox } from '../components/SearchBox'
import { TallyMarks } from '../components/TallyMarks'
import { useRecipes } from '../hooks/useAppData'
import { MEAL_LABELS, recipeMatches, searchTerms, seedFromId } from '../lib/format'
import { MEALS, type Meal, type RecipeListItem, type SourceType } from '../lib/types'

type FilterKey = 'all' | Meal

const FILTERS: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  ...MEALS.map((meal) => ({ key: meal, label: MEAL_LABELS[meal] })),
]

const SRC_CLASS: Record<SourceType, string> = {
  video: 'src',
  book: 'src src-book',
  notes: 'src src-mine',
}

function sourceLine(recipe: RecipeListItem): string {
  const parts: string[] = []
  if (recipe.sourceType === 'video') parts.push('Youtube')
  else if (recipe.sourceType === 'book') parts.push(recipe.sourceAuthor ?? 'Book')
  else parts.push('My notes')
  if (recipe.sourceType === 'video' && recipe.sourceAuthor) parts.push(recipe.sourceAuthor)
  if (recipe.sourceDetail) parts.push(recipe.sourceDetail)
  return parts.join(' · ')
}

function matchesTerms(name: string, terms: string[]): boolean {
  const lower = name.toLowerCase()
  return terms.some((term) => lower.includes(term))
}

function RecipeRow({ recipe, terms }: { recipe: RecipeListItem; terms: string[] }) {
  const navigate = useNavigate()
  // Show why the row matched: searched-for ingredients jump ahead of the rest.
  const ordered =
    terms.length === 0
      ? recipe.ingredients
      : [...recipe.ingredients].sort((a, b) => Number(matchesTerms(b.name, terms)) - Number(matchesTerms(a.name, terms)))
  const chips = ordered.slice(0, 3)
  const overflow = recipe.ingredients.length - chips.length
  return (
    <li className="py-[18px] border-t border-rule first:border-t-0 first:pt-0.5 cursor-pointer" onClick={() => navigate(`/recipe/${recipe.id}`)}>
      <div className="flex gap-3.5 items-start">
        <h3 className="flex-1 font-display font-semibold text-[17px] leading-[1.1] tracking-[-0.01em]">{recipe.title}</h3>
        <RecipeThumb id={recipe.id} thumbUrl={recipe.thumbUrl} title={recipe.title} />
      </div>
      <div className="rec-meta mt-[7px]">
        <span className={SRC_CLASS[recipe.sourceType]} />
        {sourceLine(recipe)}
      </div>
      {chips.length > 0 && (
        <div className="flex flex-wrap gap-[5px] mt-2.5">
          {chips.map((chip) => (
            <IngChip key={chip.id} name={chip.name} role={chip.role} amount={chip.amount} />
          ))}
          {overflow > 0 && <span className="font-mono2 text-[10.5px] text-muted px-0.5 py-1">+{overflow}</span>}
        </div>
      )}
      <div className="flex items-center gap-2.5 mt-2.5">
        {recipe.timesCooked > 0 ? (
          <>
            <span className="reps">Cooked</span>
            <TallyMarks count={recipe.timesCooked} seed={seedFromId(recipe.id)} className="text-ink" />
          </>
        ) : (
          <span className="reps">Never cooked</span>
        )}
        <span className="meal-tag ml-auto">{MEAL_LABELS[recipe.meal]}</span>
      </div>
    </li>
  )
}

export function RecipeList() {
  const { recipes, error, loading } = useRecipes()
  const [filter, setFilter] = useState<FilterKey>('all')
  const [query, setQuery] = useState('')

  const terms = useMemo(() => searchTerms(query), [query])

  const filtered = useMemo(() => {
    if (!recipes) return []
    return recipes.filter((r) => (filter === 'all' || r.meal === filter) && recipeMatches(r, terms))
  }, [recipes, filter, terms])

  return (
    <section className="flex-1 flex flex-col">
      <TopBar
        left={<h1 className="h-display text-[clamp(34px,10vw,42px)]">Recipe&nbsp;Box</h1>}
      />
      <div className="px-5 pb-[108px]">
        <SearchBox value={query} onChange={setQuery} placeholder="Search recipes or ingredients" className="mb-3.5" />
        <FilterChips options={FILTERS} active={filter} onChange={setFilter} />
        {error && <p className="text-sear text-[14px]">{error}</p>}
        {!error && !loading && filtered.length === 0 && (
          <div className="bigfield mt-2">
            <p className="text-[15px] text-muted leading-normal">
              {terms.length > 0
                ? `No recipes match “${query.trim()}”.`
                : filter === 'all'
                  ? 'The box is empty. Tap the yellow button and put the first recipe in.'
                  : 'Nothing in the box matches that filter.'}
            </p>
          </div>
        )}
        <ul className="list-none m-0 p-0">
          {filtered.map((recipe) => (
            <RecipeRow key={recipe.id} recipe={recipe} terms={terms} />
          ))}
        </ul>
      </div>
    </section>
  )
}
