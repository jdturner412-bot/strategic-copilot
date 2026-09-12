import { useEffect, useMemo, useState } from 'react'
import { usePhotos } from '@/data'
import type { Photo, Settings } from '@/data/types'
import { formatLongDate, formatTime } from '@/lib/dates'
import { useNow } from '@/lib/useNow'

/**
 * Object URLs for a set of photo Blobs, revoked when the set changes so a
 * display left running for weeks does not leak one URL per slideshow loop.
 */
function usePhotoUrls(photos: Photo[]): string[] {
  const ids = photos.map((photo) => photo.id).join(',')
  const urls = useMemo(
    () => photos.map((photo) => URL.createObjectURL(photo.blob)),
    // Rebuilding on every render would churn URLs; the id list is the identity.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ids],
  )
  useEffect(() => () => urls.forEach((url) => URL.revokeObjectURL(url)), [urls])
  return urls
}

interface ScreensaverProps {
  settings: Settings
  onWake: () => void
}

/**
 * The idle state of the display: a slow slideshow of family photos with the
 * time over it. Any touch anywhere returns to the planner.
 */
export function Screensaver({ settings, onWake }: ScreensaverProps) {
  const photos = usePhotos()
  const urls = usePhotoUrls(photos)
  const now = useNow(10_000)
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (urls.length <= 1) return
    const timer = window.setInterval(
      () => setIndex((current) => (current + 1) % urls.length),
      Math.max(settings.screensaverIntervalSeconds, 3) * 1000,
    )
    return () => window.clearInterval(timer)
  }, [urls.length, settings.screensaverIntervalSeconds])

  // A photo removed while the slideshow is running must not leave a blank frame.
  useEffect(() => {
    if (index >= urls.length) setIndex(0)
  }, [index, urls.length])

  return (
    <div
      className="animate-fade-in fixed inset-0 z-50 bg-black"
      role="button"
      tabIndex={0}
      aria-label="Return to the planner"
      onPointerDown={onWake}
      onKeyDown={onWake}
    >
      {urls.map((url, position) => (
        <img
          key={url}
          src={url}
          alt=""
          className="absolute inset-0 h-full w-full object-cover transition-opacity duration-1000"
          style={{
            opacity: position === index ? 1 : 0,
            // A very slow drift keeps a static photo from looking like a frozen screen.
            animation: position === index ? 'slow-pan 24s ease-in-out infinite alternate' : 'none',
          }}
        />
      ))}

      {/* A scrim keeps the clock legible over a bright photo. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-black/40" />

      {/* The safe-area inset sits on the wrapper; the padding that positions
          the clock goes inside, or the two utilities fight over `padding`. */}
      <div className="pb-safe pl-safe absolute bottom-0 left-0">
        <div className="p-14 text-white">
          <p className="text-[7rem] leading-none font-black tabular-nums drop-shadow-lg">
            {formatTime(now)}
          </p>
          <p className="mt-3 text-4xl font-bold text-white/80 drop-shadow">
            {formatLongDate(now)}
          </p>
        </div>
      </div>

      {urls.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <p className="max-w-lg px-8 text-center text-2xl text-white/50">
            Add photos in Settings and they'll play here when the planner has been
            idle. Tap anywhere to go back.
          </p>
        </div>
      )}
    </div>
  )
}
