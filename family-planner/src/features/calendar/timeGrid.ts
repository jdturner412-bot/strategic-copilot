import type { EventOccurrence } from '@/lib/events'
import { endOfDay, startOfDay } from '@/lib/dates'

export const HOUR_HEIGHT = 68
export const DAY_HEIGHT = HOUR_HEIGHT * 24

export interface PositionedOccurrence {
  occurrence: EventOccurrence
  /** Pixels from midnight. */
  top: number
  height: number
  /** Fractions of the column width, for side-by-side overlapping events. */
  left: number
  width: number
}

/** Minutes from midnight, clamped to the day so multi-day events don't overflow. */
function minutesWithinDay(date: Date, day: Date, edge: 'start' | 'end'): number {
  const dayStart = startOfDay(day)
  const dayEnd = endOfDay(day)
  if (date < dayStart) return edge === 'start' ? 0 : 0
  if (date > dayEnd) return 24 * 60
  return (date.getTime() - dayStart.getTime()) / 60_000
}

/**
 * Lay out one day's timed events, splitting overlapping events across the
 * column. Events are packed greedily into the first free lane, then each
 * cluster of mutually overlapping events shares the width evenly — the
 * behaviour every calendar app converges on and the one families expect.
 */
export function layoutDay(occurrences: EventOccurrence[], day: Date): PositionedOccurrence[] {
  const timed = occurrences
    .filter((occurrence) => !occurrence.event.allDay)
    .map((occurrence) => {
      const startMin = minutesWithinDay(occurrence.start, day, 'start')
      const endMin = minutesWithinDay(occurrence.end, day, 'end')
      return {
        occurrence,
        startMin,
        // A zero-length event still needs a tappable block.
        endMin: Math.max(endMin, startMin + 20),
      }
    })
    .sort((a, b) => a.startMin - b.startMin || b.endMin - a.endMin)

  const lanes: number[] = []
  const assigned = timed.map((item) => {
    let lane = lanes.findIndex((laneEnd) => laneEnd <= item.startMin)
    if (lane === -1) {
      lane = lanes.length
      lanes.push(item.endMin)
    } else {
      lanes[lane] = item.endMin
    }
    return { ...item, lane }
  })

  // Cluster = a run of events that transitively overlap; they share the width.
  const positioned: PositionedOccurrence[] = []
  let cluster: typeof assigned = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length === 0) return
    const laneCount = Math.max(...cluster.map((item) => item.lane)) + 1
    for (const item of cluster) {
      positioned.push({
        occurrence: item.occurrence,
        top: (item.startMin / 60) * HOUR_HEIGHT,
        height: Math.max(((item.endMin - item.startMin) / 60) * HOUR_HEIGHT, 28),
        left: item.lane / laneCount,
        width: 1 / laneCount,
      })
    }
    cluster = []
  }

  for (const item of assigned) {
    if (item.startMin >= clusterEnd) {
      flush()
      clusterEnd = item.endMin
    } else {
      clusterEnd = Math.max(clusterEnd, item.endMin)
    }
    cluster.push(item)
  }
  flush()

  return positioned
}

export const HOUR_LABELS = Array.from({ length: 24 }, (_, hour) => {
  if (hour === 0) return '12 AM'
  if (hour === 12) return 'Noon'
  return hour < 12 ? `${hour} AM` : `${hour - 12} PM`
})
