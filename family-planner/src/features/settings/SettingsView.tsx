import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button, IconButton } from '@/components/Button'
import { DownloadIcon, PhotoIcon, TrashIcon, UploadIcon } from '@/components/Icons'
import { DeleteButton } from '@/components/Sheet'
import { repo, usePhotos, useSettings } from '@/data'
import { seed } from '@/data/seed'
import { Screensaver } from '@/features/screensaver/Screensaver'
import type { ThemeMode } from '@/data/types'
import { fileToPhotoBlob } from '@/lib/image'
import { resolveTheme } from '@/lib/useTheme'
import { cn } from '@/lib/cn'

const THEME_MODES: Array<{ id: ThemeMode; label: string }> = [
  { id: 'auto', label: 'Auto' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
]

const IDLE_OPTIONS = [0, 2, 5, 10, 30]
const INTERVAL_OPTIONS = [5, 10, 20, 60]

export function SettingsView() {
  const settings = useSettings()
  const photos = usePhotos()
  const photoInput = useRef<HTMLInputElement>(null)
  const importInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const addPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setBusy(`Adding ${files.length} photo${files.length === 1 ? '' : 's'}…`)
    let order = photos.length
    for (const file of Array.from(files)) {
      const blob = await fileToPhotoBlob(file)
      await repo.photos.create({ name: file.name, blob, sortOrder: order })
      order += 1
    }
    setBusy(null)
  }

  const exportData = async () => {
    const json = await repo.exportJson()
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `family-planner-${new Date().toISOString().slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  const importData = async (file: File | undefined) => {
    if (!file) return
    setBusy('Restoring backup…')
    await repo.importJson(await file.text())
    setBusy(null)
  }

  return (
    <div className="no-scrollbar h-full overflow-y-auto px-8 pt-5 pb-8">
      <header className="mb-5">
        <h1 className="text-4xl font-black tracking-tight">Settings</h1>
        <p className="mt-1 text-lg text-muted">
          Everything is stored on this device. Nothing leaves the iPad.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-6">
        <Section title="Household">
          <Row label="Family name">
            <input
              className="field max-w-xs"
              value={settings.householdName}
              onChange={(event) => void repo.updateSettings({ householdName: event.target.value })}
            />
          </Row>
          <Row label="Week starts on">
            <Choice
              options={[
                { value: 0, label: 'Sunday' },
                { value: 1, label: 'Monday' },
              ]}
              value={settings.weekStartsOn}
              onChange={(value) => void repo.updateSettings({ weekStartsOn: value as 0 | 1 })}
            />
          </Row>
          <Row label="Chore points">
            <Choice
              options={[
                { value: true, label: 'On' },
                { value: false, label: 'Off' },
              ]}
              value={settings.rewardsEnabled}
              onChange={(value) => void repo.updateSettings({ rewardsEnabled: value as boolean })}
            />
          </Row>
        </Section>

        <Section
          title="Appearance"
          hint={`Currently showing the ${resolveTheme(settings)} theme.`}
        >
          <Row label="Theme">
            <Choice
              options={THEME_MODES.map((mode) => ({ value: mode.id, label: mode.label }))}
              value={settings.themeMode}
              onChange={(value) => void repo.updateSettings({ themeMode: value as ThemeMode })}
            />
          </Row>
          {settings.themeMode === 'auto' && (
            <>
              <Row label="Light from">
                <HourPicker
                  value={settings.lightThemeStartHour}
                  onChange={(hour) => void repo.updateSettings({ lightThemeStartHour: hour })}
                />
              </Row>
              <Row label="Dark from">
                <HourPicker
                  value={settings.darkThemeStartHour}
                  onChange={(hour) => void repo.updateSettings({ darkThemeStartHour: hour })}
                />
              </Row>
            </>
          )}
        </Section>

        <Section
          title="Screensaver"
          hint="After the display sits untouched, the photos below play full-screen. Tap anywhere to come back."
        >
          <Row label="Starts after">
            <Choice
              options={IDLE_OPTIONS.map((minutes) => ({
                value: minutes,
                label: minutes === 0 ? 'Never' : `${minutes} min`,
              }))}
              value={settings.screensaverAfterMinutes}
              onChange={(value) =>
                void repo.updateSettings({ screensaverAfterMinutes: value as number })
              }
            />
          </Row>
          <Row label="Each photo">
            <Choice
              options={INTERVAL_OPTIONS.map((seconds) => ({
                value: seconds,
                label: seconds >= 60 ? '1 min' : `${seconds}s`,
              }))}
              value={settings.screensaverIntervalSeconds}
              onChange={(value) =>
                void repo.updateSettings({ screensaverIntervalSeconds: value as number })
              }
            />
          </Row>
        </Section>

        <Section title="Backup">
          <p className="text-lg text-muted">
            Multi-device sync is not part of this version. Until it is, a backup file is
            how the planner moves to another iPad.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button icon={<DownloadIcon className="h-6 w-6" />} onClick={exportData}>
              Export everything
            </Button>
            <Button
              icon={<UploadIcon className="h-6 w-6" />}
              onClick={() => importInput.current?.click()}
            >
              Restore a backup
            </Button>
            <input
              ref={importInput}
              type="file"
              accept="application/json"
              className="hidden"
              onChange={(event) => void importData(event.target.files?.[0])}
            />
          </div>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button onClick={() => void seed()}>Add sample data</Button>
            <DeleteButton
              label="Erase all data"
              onConfirm={() => void repo.clearAll().then(() => window.location.reload())}
            />
          </div>
        </Section>

        <Section
          title={`Photos (${photos.length})`}
          className="col-span-2"
          action={
            <div className="flex gap-3">
              <Button onClick={() => setPreviewing(true)} disabled={photos.length === 0}>
                Preview
              </Button>
              <Button
                variant="primary"
                icon={<PhotoIcon className="h-6 w-6" />}
                onClick={() => photoInput.current?.click()}
              >
                Add photos
              </Button>
            </div>
          }
        >
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(event) => void addPhotos(event.target.files)}
          />
          {photos.length === 0 ? (
            <p className="py-8 text-center text-lg text-muted">
              No photos yet. Add a few and they'll play while the planner is idle.
            </p>
          ) : (
            <div className="grid grid-cols-6 gap-3">
              {photos.map((photo) => (
                <PhotoTile key={photo.id} blob={photo.blob} onRemove={() => void repo.photos.remove(photo.id)} />
              ))}
            </div>
          )}
        </Section>
      </div>

      {/* Lets a family check the slideshow without waiting out the idle timer. */}
      {previewing && <Screensaver settings={settings} onWake={() => setPreviewing(false)} />}

      {busy && (
        <div className="fixed inset-x-0 bottom-8 mx-auto w-fit rounded-2xl bg-accent px-6 py-3 text-lg font-bold text-white shadow-card">
          {busy}
        </div>
      )}
    </div>
  )
}

function PhotoTile({ blob, onRemove }: { blob: Blob; onRemove: () => void }) {
  // One object URL per tile, released when the tile unmounts.
  const [url] = useState(() => URL.createObjectURL(blob))
  useEffect(() => () => URL.revokeObjectURL(url), [url])
  return (
    <div className="relative aspect-square overflow-hidden rounded-2xl border border-line">
      <img src={url} alt="" className="h-full w-full object-cover" />
      <IconButton
        label="Remove photo"
        tone="danger"
        onClick={onRemove}
        className="absolute top-1 right-1 h-12 w-12 bg-black/60"
      >
        <TrashIcon className="h-5 w-5" />
      </IconButton>
    </div>
  )
}

function Section({
  title, hint, children, className, action,
}: {
  title: string
  hint?: string
  children: ReactNode
  className?: string
  action?: ReactNode
}) {
  return (
    <section className={cn('card space-y-4 p-6', className)}>
      <div className="flex items-start gap-4">
        <div className="flex-1">
          <h2 className="text-2xl font-bold">{title}</h2>
          {hint && <p className="mt-1 text-base text-muted">{hint}</p>}
        </div>
        {action}
      </div>
      {children}
    </section>
  )
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span className="w-36 shrink-0 text-lg font-bold text-muted">{label}</span>
      {children}
    </div>
  )
}

function Choice<T extends string | number | boolean>({
  options, value, onChange,
}: {
  options: Array<{ value: T; label: string }>
  value: T
  onChange: (value: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => (
        <button
          key={String(option.value)}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            'touch-target pressable rounded-2xl border px-5 py-2.5 text-lg font-bold',
            value === option.value
              ? 'border-accent bg-accent-soft text-ink'
              : 'border-line bg-panel text-muted',
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}

function HourPicker({ value, onChange }: { value: number; onChange: (hour: number) => void }) {
  return (
    <select
      className="field max-w-40"
      value={value}
      onChange={(event) => onChange(Number(event.target.value))}
    >
      {Array.from({ length: 24 }, (_, hour) => (
        <option key={hour} value={hour}>
          {hour === 0 ? '12 AM' : hour === 12 ? '12 PM' : hour < 12 ? `${hour} AM` : `${hour - 12} PM`}
        </option>
      ))}
    </select>
  )
}
