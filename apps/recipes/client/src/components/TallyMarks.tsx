/**
 * Hand-drawn tally marks — the app's signature. Every stroke is drawn with
 * seeded jitter (a tiny LCG) so no two tallies match, but a given recipe's
 * tally is stable across renders. Groups of five get the diagonal strike.
 * Strokes use currentColor, so a yolk "new stroke" is just a className.
 */

interface TallyMarksProps {
  count: number
  seed: number
  className?: string
}

export function TallyMarks({ count, seed, className }: TallyMarksProps) {
  if (count <= 0) return null

  let r = (seed * 9301) % 233280
  const rnd = () => (r = (r * 9301 + 49297) % 233280) / 233280

  const paths: string[] = []
  const groups = Math.ceil(count / 5)
  for (let g = 0; g < groups; g++) {
    const c = Math.min(5, count - g * 5)
    const base = g * 23
    for (let i = 0; i < Math.min(c, 4); i++) {
      const j = (rnd() - 0.5) * 1.6
      const k = (rnd() - 0.5) * 1.2
      paths.push(`M${base + i * 4.4 + 2 + j} ${2 + k * 0.6} L${base + i * 4.4 + 2 - j} ${16 + k}`)
    }
    if (c === 5) {
      paths.push(`M${base - 0.5} ${15 + (rnd() - 0.5)} L${base + 16} ${2.5 + (rnd() - 0.5)}`)
    }
  }

  const w = groups * 23
  return (
    <svg
      viewBox={`0 0 ${Math.max(w, 1)} 18`}
      width={w * 0.82}
      height={15}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      className={className}
      style={{ verticalAlign: '-2px' }}
      aria-label={`${count} times`}
      role="img"
    >
      {paths.map((d, i) => (
        <path key={i} d={d} />
      ))}
    </svg>
  )
}
