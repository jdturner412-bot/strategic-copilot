import { useEffect, useRef, useState } from 'react'

/**
 * True once the display has gone untouched for `timeoutMs`. Passing 0 disables
 * idle detection entirely (Settings → screensaver off).
 */
export function useIdle(timeoutMs: number): [boolean, () => void] {
  const [idle, setIdle] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => {
    if (timeoutMs <= 0) {
      setIdle(false)
      return
    }

    const reset = () => {
      setIdle(false)
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setIdle(true), timeoutMs)
    }

    // `pointerdown` covers touch and mouse; `keydown` keeps a paired keyboard alive.
    const events = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart']
    events.forEach((event) => window.addEventListener(event, reset, { passive: true }))
    reset()

    return () => {
      events.forEach((event) => window.removeEventListener(event, reset))
      window.clearTimeout(timer.current)
    }
  }, [timeoutMs])

  return [idle, () => setIdle(false)]
}
