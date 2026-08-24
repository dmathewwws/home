import { useEffect, useMemo, useRef } from 'react'
import { monthLabel, trailingDays } from '../lib/dates'
import { hueFor, intensityFor, mix } from '../lib/hues'
import type { HeatDatum, Hobby } from '../lib/types'

const DAYS = 84 // 12 weeks

interface HeatmapProps {
  heatmap: HeatDatum[]
  hobbies: Hobby[]
  today: string
  /** Bump to make today's tile pop (after a log). */
  popSignal: number
}

/**
 * The twelve-week grid: 12 week-columns × 7 day-rows, ending at today
 * (bottom-right). Each day's cell takes the hue of the hobby logged most that
 * day, blended toward paper by session count — consistency, balance, and
 * instant feedback in one visualization.
 */
export function Heatmap({ heatmap, hobbies, today, popSignal }: HeatmapProps) {
  const days = useMemo(() => trailingDays(DAYS, today), [today])
  const hobbyById = useMemo(() => new Map(hobbies.map((h) => [h.id, h])), [hobbies])

  const cellColors = useMemo(() => {
    // date → dominant hobby (max count; ties go to the earlier-created hobby
    // via hobbies order) + total count for intensity
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
      const dominant = [...data].sort(
        (a, b) => b.count - a.count || (order.get(a.hobbyId) ?? 99) - (order.get(b.hobbyId) ?? 99),
      )[0]
      const hobby = hobbyById.get(dominant.hobbyId)
      if (!hobby) return undefined
      const total = data.reduce((sum, d) => sum + d.count, 0)
      return mix(hueFor(hobby), intensityFor(total))
    })
  }, [heatmap, hobbies, hobbyById, days])

  // Today's tile pops when a session is logged
  const todayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (popSignal === 0) return
    todayRef.current?.animate?.(
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
          const isToday = dayIndex === DAYS - 1
          return (
            <div
              key={i}
              ref={isToday ? todayRef : undefined}
              className="aspect-square rounded-[6px]"
              style={{ background: cellColors[dayIndex] ?? '#EFEEE7' }}
            />
          )
        })}
      </div>
      <div className="flex justify-between mt-[10px] font-mono text-[11px] tracking-[0.14em] text-muted uppercase">
        <span>{monthLabel(days[0])}</span>
        <span>Day color = hobby you did most</span>
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
