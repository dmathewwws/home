/**
 * SVG weight trend line for the 3-month window: adaptive integer-ish
 * gridlines, dashed goal line, soft area fill, and a dot on the last point.
 * The y-domain always includes the goal so the dashed line stays visible.
 */

import type { WeightEntry } from '../lib/types'
import { formatShort } from '../lib/dates'

const W = 360
const H = 170
const PAD_L = 38
const PAD_R = 12
const PAD_T = 14
const PAD_B = 24

const LINE_COLOR = '#5FA8A0' // bike teal
const GOAL_COLOR = '#93B88B' // stretch sage

export function WeightChart({ entries, goal }: { entries: WeightEntry[]; goal: number }) {
  if (entries.length === 0) {
    return (
      <div className="h-[120px] flex items-center justify-center rounded-2xl border border-dashed border-line-btn text-[13px] text-faint">
        Log your first weight to see the trend.
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

  const x = (i: number) => PAD_L + (entries.length === 1 ? 0.5 : i / (entries.length - 1)) * (W - PAD_L - PAD_R)
  const y = (v: number) => PAD_T + (1 - (v - min) / (max - min)) * (H - PAD_T - PAD_B)

  const linePath = vals.map((v, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(v)}`).join(' ')
  const areaPath = `${linePath} L ${x(vals.length - 1)} ${H - PAD_B} L ${x(0)} ${H - PAD_B} Z`

  const n = entries.length
  const labelIdx = [...new Set([0, Math.round((n - 1) / 3), Math.round(((n - 1) * 2) / 3), n - 1])]

  const last = n - 1

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
      <circle cx={x(last)} cy={y(vals[last])} r={4.5} fill={LINE_COLOR} stroke="#fff" strokeWidth={2} />

      {labelIdx.map((i) => (
        <text
          key={i}
          x={x(i)}
          y={H - 8}
          textAnchor="middle"
          fontSize={9}
          fill="var(--color-ink-3)"
          fontFamily='"DM Mono", monospace'
          fontWeight={500}
        >
          {formatShort(entries[i].date)}
        </text>
      ))}
    </svg>
  )
}
