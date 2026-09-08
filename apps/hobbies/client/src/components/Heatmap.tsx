import { useEffect, useMemo, useRef } from 'react'
import { monthLabel, trailingDays } from '../lib/dates'
import { hueFor, intensityFor, mix } from '../lib/hues'
import type { HeatDatum, Hobby } from '../lib/types'

const DAYS = 84 // 12 weeks

interface HeatmapProps {
  heatmap: HeatDatum[]
  hobbies: Hobby[]
  today: string
  /** The day the log flow targets — today by default, or a tapped past tile. */
  selectedDate: string
  onSelectDay: (date: string) => void
  /** Bump to make the selected tile pop (after a log). */
  popSignal: number
}

/** Most hobbies a single day tile will show; the rest (lowest counts) are dropped. */
const MAX_SEGMENTS = 4

/**
 * The twelve-week grid: 12 week-columns × 7 day-rows, ending at today
 * (bottom-right). Each day's cell splits into up to four blocks — one per
 * hobby logged that day (1 = full tile, 2 = halves, 3 = half + two quarters,
 * 4 = quadrants), ordered by session count — each blended toward paper by that
 * hobby's own count. Consistency, balance, and instant feedback in one
 * visualization. Tiles are buttons: tapping one selects that day for logging.
 */
export function Heatmap({ heatmap, hobbies, today, selectedDate, onSelectDay, popSignal }: HeatmapProps) {
  const days = useMemo(() => trailingDays(DAYS, today), [today])
  const hobbyById = useMemo(() => new Map(hobbies.map((h) => [h.id, h])), [hobbies])

  const cellSegments = useMemo(() => {
    // date → up to MAX_SEGMENTS colours, most-logged hobby first (ties go to
    // the earlier-created hobby via hobbies order)
    const byDate = new Map<string, HeatDatum[]>()
    for (const d of heatmap) {
      const list = byDate.get(d.date) ?? []
      list.push(d)
      byDate.set(d.date, list)
    }
    const order = new Map(hobbies.map((h, i) => [h.id, i]))
    return days.map((date) => {
      const data = byDate.get(date)
      if (!data || data.length === 0) return undefined
      const colors = [...data]
        .sort(
          (a, b) =>
            b.count - a.count || (order.get(a.hobbyId) ?? 99) - (order.get(b.hobbyId) ?? 99),
        )
        .flatMap((d) => {
          const hobby = hobbyById.get(d.hobbyId)
          return hobby ? [mix(hueFor(hobby), intensityFor(d.count))] : []
        })
        .slice(0, MAX_SEGMENTS)
      return colors.length > 0 ? colors : undefined
    })
  }, [heatmap, hobbies, hobbyById, days])

  // The selected tile pops when a session is logged onto it
  const selectedRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    if (popSignal === 0) return
    selectedRef.current?.animate?.(
      [{ transform: 'scale(.6)' }, { transform: 'scale(1.15)' }, { transform: 'scale(1)' }],
      { duration: 340, easing: 'ease-out' },
    )
  }, [popSignal])

  return (
    <div>
      <div
        className="grid gap-[6px] mt-5"
        style={{ gridTemplateColumns: 'repeat(12, 1fr)' }}
        aria-label="Twelve week activity grid"
      >
        {Array.from({ length: DAYS }, (_, i) => {
          // Row-major placement: row = weekday slot, column = week.
          const row = Math.floor(i / 12)
          const col = i % 12
          const dayIndex = col * 7 + row
          const date = days[dayIndex]
          const isSelected = date === selectedDate
          const segments = cellSegments[dayIndex]
          return (
            <button
              key={i}
              type="button"
              ref={isSelected ? selectedRef : undefined}
              aria-label={date === today ? `Today, ${date}` : date}
              aria-pressed={isSelected}
              className="aspect-square rounded-[6px] overflow-hidden grid grid-cols-2 grid-rows-2 p-0 cursor-pointer"
              style={{
                background: '#EFEEE7',
                outline: isSelected ? '2px solid var(--color-ink)' : undefined,
                outlineOffset: 2,
              }}
              onClick={() => onSelectDay(date)}
            >
              {segments?.map((color, s) => (
                <i
                  key={s}
                  className={segmentClass(segments.length, s)}
                  style={{ background: color }}
                />
              ))}
            </button>
          )
        })}
      </div>
      <div className="flex justify-between mt-[10px] font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
        <span>{monthLabel(days[0])}</span>
        <span>Tap a day to log it · up to 4 hobbies</span>
        <span>{monthLabel(days[DAYS - 1])}</span>
      </div>
      <div className="flex gap-[14px] flex-wrap mt-[14px]">
        {hobbies.map((h) => (
          <span key={h.id} className="inline-flex items-center gap-[6px] text-[12.5px] text-ink-soft">
            <i className="w-[10px] h-[10px] rounded-[3px] inline-block" style={{ background: hueFor(h) }} />
            {h.name}
          </span>
        ))}
      </div>
    </div>
  )
}

/**
 * Grid placement of block `index` inside a 2×2 tile holding `count` blocks:
 * 1 → whole tile, 2 → left/right halves, 3 → left half + two right quarters,
 * 4 → quadrants.
 */
function segmentClass(count: number, index: number): string {
  if (count === 1) return 'col-span-2 row-span-2'
  if (count === 2) return 'row-span-2'
  if (count === 3 && index === 0) return 'row-span-2'
  return ''
}
