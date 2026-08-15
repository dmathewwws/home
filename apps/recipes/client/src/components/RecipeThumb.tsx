/**
 * Recipe thumbnail: the real video thumbnail for imports, otherwise a
 * deterministic duotone placeholder in the app's palette (which art a recipe
 * gets is derived from its id, so it's stable).
 */

import { seedFromId } from '../lib/format'

const ART = [
  // pizza
  `<circle cx="50" cy="50" r="34" fill="#E9A612"/><circle cx="50" cy="50" r="34" fill="none" stroke="#241F1A" stroke-width="4"/><circle cx="38" cy="42" r="6" fill="#9C3B14"/><circle cx="60" cy="55" r="6" fill="#9C3B14"/><circle cx="52" cy="34" r="5" fill="#9C3B14"/>`,
  // bowl
  `<circle cx="50" cy="50" r="33" fill="#2E5C8A"/><path d="M28 50a22 22 0 0044 0z" fill="#9C3B14"/><rect x="40" y="34" width="9" height="9" fill="#E9A612"/><rect x="53" y="40" width="9" height="9" fill="#E9A612"/>`,
  // pot
  `<rect x="22" y="36" width="56" height="38" rx="4" fill="#241F1A"/><rect x="18" y="28" width="64" height="9" fill="#9C3B14"/><circle cx="50" cy="24" r="4" fill="#241F1A"/>`,
  // whisk
  `<circle cx="50" cy="56" r="24" fill="#E9A612"/><path d="M50 20v20M38 26c6 8 6 22 0 30M62 26c-6 8-6 22 0 30" stroke="#241F1A" stroke-width="4" fill="none"/>`,
  // tortilla
  `<circle cx="50" cy="50" r="32" fill="#E9A612"/><path d="M50 18a32 32 0 010 64z" fill="#d1950e"/><circle cx="50" cy="50" r="32" fill="none" stroke="#241F1A" stroke-width="3.5"/>`,
  // pan
  `<circle cx="42" cy="52" r="27" fill="#241F1A"/><rect x="66" y="48" width="26" height="7" rx="3" fill="#9C3B14"/><circle cx="42" cy="52" r="15" fill="#9C3B14"/>`,
] as const

interface RecipeThumbProps {
  id: string
  thumbUrl: string | null
  title: string
  className?: string
}

export function RecipeThumb({ id, thumbUrl, title, className = 'w-[62px] h-[62px]' }: RecipeThumbProps) {
  const frame = `${className} flex-none bg-kraft-deep border border-rule overflow-hidden`
  if (thumbUrl) {
    return <img src={thumbUrl} alt="" aria-hidden className={`${frame} object-cover`} loading="lazy" />
  }
  const art = ART[seedFromId(id) % ART.length]
  return (
    <div
      className={frame}
      aria-hidden
      dangerouslySetInnerHTML={{
        __html: `<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" style="display:block;width:100%;height:100%" role="img" aria-label="${title.replace(/"/g, '')}">${art}</svg>`,
      }}
    />
  )
}
