/**
 * The fixed 8-hue chalk-pastel palette. A hobby stores only its hueIndex;
 * slots 0–3 are the founding four (guitar, piano, hindi, chalk), 4–5 are
 * reading and cleaning, and 6 is cooking; the rest extend the family for new
 * hobbies.
 */

import type { Hobby } from './types'

export const HOBBY_HUES = [
  '#8FAF87', // 0 sage      (Guitar)
  '#7FA6C3', // 1 sky       (Piano)
  '#DFA23B', // 2 marigold  (Hindi)
  '#CE8F98', // 3 rose      (Chalk drawing)
  '#9C8FBF', // 4 lilac     (Reading)
  '#7FB8AE', // 5 seafoam   (Cleaning)
  '#C89B6E', // 6 clay      (Cooking)
  '#8F9BB3', // 7 slate
] as const

export const hueFor = (hobby: Pick<Hobby, 'hueIndex'>): string =>
  HOBBY_HUES[((hobby.hueIndex % HOBBY_HUES.length) + HOBBY_HUES.length) % HOBBY_HUES.length]

/** First palette slot no existing hobby uses (cycling past 8). */
export function nextFreeHueIndex(hobbies: Array<Pick<Hobby, 'hueIndex'>>): number {
  const used = new Set(hobbies.map((h) => h.hueIndex % HOBBY_HUES.length))
  for (let i = 0; i < HOBBY_HUES.length; i++) if (!used.has(i)) return i
  return hobbies.length % HOBBY_HUES.length
}

/**
 * Blend a hue toward the paper ground (the mockup's heat-cell tint):
 * t=0 → near-paper #EFEFE7-ish, t=1 → the full hue.
 */
export function mix(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16)
  const r = n >> 16
  const g = (n >> 8) & 255
  const b = n & 255
  const m = (c: number) => Math.round(239 + (c - 239) * t)
  return `rgb(${m(r)},${m(g)},${m(b)})`
}

/** Cell intensity from that day's session count for the dominant hobby. */
export const intensityFor = (count: number): number =>
  Math.min(1, 0.4 + 0.2 * (count - 1))
