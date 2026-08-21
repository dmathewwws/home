/**
 * SVG weight trend line for the selected range: adaptive integer-ish
 * gridlines, dashed goal line, soft area fill, and a dot on the last point.
 * The y-domain always includes the goal so the dashed line stays visible.
 * The x-axis is a true date scale — a month-long gap reads as a long flat
 * stretch, not as one evenly-spaced hop.
 */

import type { WeightEntry } from '../lib/types'
import { addDays, daysBetween, formatAxis } from '../lib/dates'

const W = 360
const H = 170
const PAD_L = 38
const PAD_R = 12
const PAD_T = 14
const PAD_B = 24

const LINE_COLOR = '#5FA8A0' // bike teal
const GOAL_COLOR = '#93B88B' // stretch sage

export function WeightChart({
  entries,
  goal,
  fromKey,
  toKey,
  emptyMessage = 'Log your first weight to see the trend.',
}: {
  entries: WeightEntry[]
  goal: number
  fromKey: string
  toKey: string
  emptyMessage?: string
}) {
  if (entries.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center rounded-2xl border border-dashed border-line-btn text-[13px] text-faint">
        {emptyMessage}
      </div>
    )
  }

  const vals = entries.map((e) => e.kg)
  const span = Math.max(...vals, goal) - Math.min(...vals, goal)
  const pad = Math.max(0.5, span * 0.05)
  const min = Math.min(...vals, goal) - pad
  const max = Math.max(...vals) + pad

  // ~4–6 gridlines whatever the domain (goal 64 under an 85 kg entry spans >20 kg)
  const step = [0.5, 1, 2, 2.5, 5, 10].find((s) => (max - min) / s <= 6) ?? 10
  const gridVals: number[] = []
  for (let g = Math.ceil(min / step) * step; g <= max; g += step) gridVals.push(Math.round(g * 10) / 10)

  // Extend the domain past today if an entry is dated ahead of it (the log
  // endpoint allows today+1), so no point falls off the right edge.
  const lastKey = entries[entries.length - 1].date
  const domainTo = lastKey > toKey ? lastKey : toKey
  const totalDays = Math.max(1, daysBetween(fromKey, domainTo))

  const x = (key: string) => PAD_L + (daysBetween(fromKey, key) / totalDays) * (W - PAD_L - PAD_R)
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * (H - PAD_T - PAD_B)

  const linePath = entries.map((e, i) => `${i === 0 ? 'M' : 'L'} ${x(e.date)} ${y(e.kg)}`).join(' ')
  const areaPath = `${linePath} L ${x(lastKey)} ${H - PAD_B} L ${x(entries[0].date)} ${H - PAD_B} Z`

  const n = entries.length
  const last = entries[n - 1]

  // Four labels evenly spaced across the *domain*, not across entry indices
  const labels = [0, 1, 2, 3].map((i) => {
    const key = addDays(fromKey, Math.round((totalDays * i) / 3))
    const anchor = i === 0 ? 'start' : i === 3 ? 'end' : 'middle'
    return { key, anchor: anchor as 'start' | 'end' | 'middle' }
  })

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" role="img" aria-label="Weight trend chart">
      {gridVals.map((g) => (
        <g key={g}>
          <line x1={PAD_L} y1={y(g)} x2={W - PAD_R} y2={y(g)} stroke="var(--color-line)" strokeWidth={1} />
          <text
            x={PAD_L - 6}
            y={y(g) + 3}
            textAnchor="end"
            fontSize={9}
            fill="var(--color-ink-3)"
            fontFamily='"DM Mono", monospace'
            fontWeight={500}
          >
            {g}
          </text>
        </g>
      ))}

      <line
        x1={PAD_L}
        y1={y(goal)}
        x2={W - PAD_R}
        y2={y(goal)}
        stroke={GOAL_COLOR}
        strokeWidth={1.5}
        strokeDasharray="4 4"
      />
      <text
        x={W - PAD_R}
        y={y(goal) - 5}
        textAnchor="end"
        fontSize={9}
        fill={GOAL_COLOR}
        fontFamily='"DM Mono", monospace'
        fontWeight={500}
      >
        goal {goal.toFixed(1)}
      </text>

      {n >= 2 && <path d={areaPath} fill={LINE_COLOR} opacity={0.08} />}
      {n >= 2 && (
        <path
          d={linePath}
          fill="none"
          stroke={LINE_COLOR}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <circle cx={x(last.date)} cy={y(last.kg)} r={4.5} fill={LINE_COLOR} stroke="#fff" strokeWidth={2} />

      {labels.map(({ key, anchor }) => (
        <text
          key={key}
          x={x(key)}
          y={H - 8}
          textAnchor={anchor}
          fontSize={9}
          fill="var(--color-ink-3)"
          fontFamily='"DM Mono", monospace'
          fontWeight={500}
        >
          {formatAxis(key, totalDays)}
        </text>
      ))}
    </svg>
  )
}
