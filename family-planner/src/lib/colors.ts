import type { MemberColorName } from '@/data/types'

export interface MemberColor {
  name: MemberColorName
  label: string
  /** Solid colour for dots, chips and event bars. */
  hex: string
  /** `r g b` triple so callers can build translucent variants inline. */
  rgb: string
  /** Text colour that stays legible on `hex` from across the room. */
  onHex: string
}

/**
 * Colours are applied as inline styles rather than Tailwind utility classes:
 * a member's colour is data, and Tailwind can only emit classes it can see in
 * the source at build time.
 */
export const MEMBER_COLORS: Record<MemberColorName, MemberColor> = {
  sky: { name: 'sky', label: 'Sky', hex: '#38bdf8', rgb: '56 189 248', onHex: '#06243a' },
  emerald: { name: 'emerald', label: 'Emerald', hex: '#34d399', rgb: '52 211 153', onHex: '#04291d' },
  amber: { name: 'amber', label: 'Amber', hex: '#fbbf24', rgb: '251 191 36', onHex: '#3a2606' },
  rose: { name: 'rose', label: 'Rose', hex: '#fb7185', rgb: '251 113 133', onHex: '#3d0612' },
  violet: { name: 'violet', label: 'Violet', hex: '#a78bfa', rgb: '167 139 250', onHex: '#1e1147' },
  teal: { name: 'teal', label: 'Teal', hex: '#2dd4bf', rgb: '45 212 191', onHex: '#032b27' },
  orange: { name: 'orange', label: 'Orange', hex: '#fb923c', rgb: '251 146 60', onHex: '#3b1a03' },
  fuchsia: { name: 'fuchsia', label: 'Fuchsia', hex: '#e879f9', rgb: '232 121 249', onHex: '#3b0a42' },
}

export const MEMBER_COLOR_LIST = Object.values(MEMBER_COLORS)

export function memberColor(name: string | undefined): MemberColor {
  return MEMBER_COLORS[(name ?? 'sky') as MemberColorName] ?? MEMBER_COLORS.sky
}

/** Translucent fill of a member colour, for event blocks and selected states. */
export function tint(name: string | undefined, alpha: number): string {
  return `rgb(${memberColor(name).rgb} / ${alpha})`
}

/** The next unused colour, so a new family member never duplicates a sibling. */
export function nextAvailableColor(taken: string[]): MemberColorName {
  const free = MEMBER_COLOR_LIST.find((color) => !taken.includes(color.name))
  return (free ?? MEMBER_COLOR_LIST[taken.length % MEMBER_COLOR_LIST.length]).name
}

/** `AB` from `Ada Byron`, `A` from `Ada` — the avatar fallback. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0].slice(0, 1).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
