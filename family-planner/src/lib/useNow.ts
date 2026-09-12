import { useEffect, useState } from 'react'

/**
 * A ticking clock for views that show "now" — the Today header, the current-time
 * line on the day grid. Defaults to a 30s tick, which is under the resolution of
 * anything displayed and keeps the display from repainting constantly.
 */
export function useNow(intervalMs = 30_000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), intervalMs)
    return () => window.clearInterval(timer)
  }, [intervalMs])
  return now
}
