import type { IngredientRole } from '../lib/types'

const ROLE_CLASS: Record<IngredientRole, string> = {
  protein: 'ing-prot',
  dairy: 'ing-dairy',
  produce: 'ing-herb',
  aromatic: 'ing-arom',
  spice: 'ing-spice',
  grain: 'ing-grain',
  fat: 'ing-fat',
  sauce: 'ing-sauce',
  sweet: 'ing-sweet',
  pantry: 'ing-pan',
}

interface IngChipProps {
  name: string
  role: IngredientRole
  amount?: string | null
  /** Dashed "said in passing" state on the import review */
  maybe?: boolean
  /** Has a swap listed ("If you're out") — shows the ⇄ */
  swap?: boolean
  /** Picked state in the ingredient picker — shows the × */
  on?: boolean
  onClick?: () => void
}

export function IngChip({ name, role, amount, maybe, swap, on, onClick }: IngChipProps) {
  const classes = [
    'ing',
    ROLE_CLASS[role],
    maybe ? 'ing-maybe' : '',
    swap ? 'ing-swap' : '',
    on ? 'ing-on' : '',
    onClick ? 'cursor-pointer' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const content = (
    <>
      {name}
      {maybe ? '?' : ''}
      {amount ? (
        <>
          {' '}
          <span className="amt">{amount}</span>
        </>
      ) : null}
    </>
  )

  if (onClick) {
    return (
      <button type="button" className={classes} onClick={onClick}>
        {content}
      </button>
    )
  }
  return <span className={classes}>{content}</span>
}
