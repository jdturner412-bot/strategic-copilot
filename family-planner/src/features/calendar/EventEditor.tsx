import { useEffect, useState } from 'react'
import { Sheet, DeleteButton } from '@/components/Sheet'
import { Button } from '@/components/Button'
import { MemberPicker } from '@/components/MemberPicker'
import { repo, useMembers } from '@/data'
import type { CalendarEvent } from '@/data/types'
import {
  addDays, fromDateKey, fromLocalInputValue, toDateKey, toLocalInputValue,
} from '@/lib/dates'
import { RECURRENCE_PRESETS } from '@/lib/recurrence'
import { cn } from '@/lib/cn'

export interface EventDraft {
  /** Present when editing; absent when creating. */
  event?: CalendarEvent
  /** The occurrence being edited, so a single instance can be removed. */
  occurrenceDate?: string
  /** Seed date for a new event. */
  defaultDate?: Date
  defaultHour?: number
}

interface EventEditorProps {
  draft: EventDraft | null
  onClose: () => void
}

interface FormState {
  title: string
  allDay: boolean
  start: string
  end: string
  location: string
  notes: string
  memberIds: string[]
  recurrenceRule: string
}

function buildForm(draft: EventDraft): FormState {
  if (draft.event) {
    const event = draft.event
    return {
      title: event.title,
      allDay: event.allDay,
      start: event.allDay ? event.start : toLocalInputValue(new Date(event.start)),
      end: event.allDay ? event.end : toLocalInputValue(new Date(event.end)),
      location: event.location ?? '',
      notes: event.notes ?? '',
      memberIds: event.memberIds,
      recurrenceRule: event.recurrenceRule ?? '',
    }
  }
  const base = draft.defaultDate ? new Date(draft.defaultDate) : new Date()
  base.setHours(draft.defaultHour ?? Math.min(base.getHours() + 1, 23), 0, 0, 0)
  const end = new Date(base.getTime() + 60 * 60_000)
  return {
    title: '',
    allDay: false,
    start: toLocalInputValue(base),
    end: toLocalInputValue(end),
    location: '',
    notes: '',
    memberIds: [],
    recurrenceRule: '',
  }
}

export function EventEditor({ draft, onClose }: EventEditorProps) {
  const members = useMembers()
  const [form, setForm] = useState<FormState>(() => buildForm(draft ?? {}))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (draft) setForm(buildForm(draft))
  }, [draft])

  if (!draft) return null

  const isEditing = Boolean(draft.event)
  const isRecurring = Boolean(draft.event?.recurrenceRule)
  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  /** Switching all-day converts between a date key and a datetime, keeping the day. */
  const toggleAllDay = (allDay: boolean) => {
    setForm((prev) => {
      if (allDay) {
        const startDate = fromLocalInputValue(prev.start)
        return { ...prev, allDay, start: toDateKey(startDate), end: toDateKey(startDate) }
      }
      const startDate = fromDateKey(prev.start)
      startDate.setHours(9, 0, 0, 0)
      const endDate = new Date(startDate.getTime() + 60 * 60_000)
      return {
        ...prev,
        allDay,
        start: toLocalInputValue(startDate),
        end: toLocalInputValue(endDate),
      }
    })
  }

  const save = async () => {
    const title = form.title.trim()
    if (!title || saving) return
    setSaving(true)

    let start = form.start
    let end = form.end
    if (form.allDay) {
      // Keep the range ordered if someone picked an end before the start.
      if (end < start) end = start
    } else {
      const startDate = fromLocalInputValue(form.start)
      let endDate = fromLocalInputValue(form.end)
      if (endDate <= startDate) endDate = new Date(startDate.getTime() + 30 * 60_000)
      start = startDate.toISOString()
      end = endDate.toISOString()
    }

    const payload = {
      title,
      start,
      end,
      allDay: form.allDay,
      location: form.location.trim() || undefined,
      notes: form.notes.trim() || undefined,
      memberIds: form.memberIds,
      recurrenceRule: form.recurrenceRule || undefined,
      exceptionDates: draft.event?.exceptionDates,
    }

    if (draft.event) await repo.events.update(draft.event.id, payload)
    else await repo.events.create(payload)

    setSaving(false)
    onClose()
  }

  /** Recurring series get two delete options; one-offs just get one. */
  const deleteOccurrence = async () => {
    if (!draft.event) return
    const date = draft.occurrenceDate ?? toDateKey(new Date(draft.event.start))
    await repo.events.update(draft.event.id, {
      exceptionDates: [...(draft.event.exceptionDates ?? []), date],
    })
    onClose()
  }

  const deleteSeries = async () => {
    if (!draft.event) return
    await repo.events.remove(draft.event.id)
    onClose()
  }

  return (
    <Sheet
      open
      title={isEditing ? 'Edit event' : 'New event'}
      subtitle={isRecurring ? 'Part of a repeating series' : undefined}
      onClose={onClose}
      footer={
        <>
          {isEditing && (
            <DeleteButton
              onConfirm={isRecurring ? deleteOccurrence : deleteSeries}
              label={isRecurring ? 'Delete this one' : 'Delete'}
            />
          )}
          {isEditing && isRecurring && (
            <DeleteButton onConfirm={deleteSeries} label="Delete series" />
          )}
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" onClick={save} disabled={!form.title.trim() || saving}>
            Save
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <Field label="What is it?">
          <input
            className="field text-2xl font-semibold"
            value={form.title}
            placeholder="Soccer practice"
            autoFocus
            onChange={(event) => set('title', event.target.value)}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Toggle checked={form.allDay} onChange={toggleAllDay} label="All day" />
          {form.allDay && (
            <QuickDate
              onPick={(date) => setForm((p) => ({ ...p, start: toDateKey(date), end: toDateKey(date) }))}
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Starts">
            <input
              className="field"
              type={form.allDay ? 'date' : 'datetime-local'}
              value={form.start}
              onChange={(event) => set('start', event.target.value)}
            />
          </Field>
          <Field label={form.allDay ? 'Ends (inclusive)' : 'Ends'}>
            <input
              className="field"
              type={form.allDay ? 'date' : 'datetime-local'}
              value={form.end}
              onChange={(event) => set('end', event.target.value)}
            />
          </Field>
        </div>

        <Field label="Who's involved?">
          <MemberPicker
            members={members}
            selectedIds={form.memberIds}
            onChange={(ids) => set('memberIds', ids)}
          />
        </Field>

        <Field label="Repeats">
          <div className="flex flex-wrap gap-3">
            {RECURRENCE_PRESETS.map((preset) => {
              const value = preset.rule ?? ''
              const active = form.recurrenceRule === value
              return (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => set('recurrenceRule', value)}
                  className={cn(
                    'touch-target pressable rounded-2xl border px-5 py-3 text-lg font-semibold',
                    active
                      ? 'border-accent bg-accent-soft text-ink'
                      : 'border-line bg-panel text-muted',
                  )}
                >
                  {preset.label}
                </button>
              )
            })}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Where?">
            <input
              className="field"
              value={form.location}
              placeholder="Field 3"
              onChange={(event) => set('location', event.target.value)}
            />
          </Field>
          <Field label="Notes">
            <input
              className="field"
              value={form.notes}
              placeholder="Bring shin guards"
              onChange={(event) => set('notes', event.target.value)}
            />
          </Field>
        </div>
      </div>
    </Sheet>
  )
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-base font-bold tracking-wide text-muted uppercase">
        {label}
      </span>
      {children}
    </label>
  )
}

export function Toggle({
  checked, onChange, label,
}: {
  checked: boolean
  onChange: (value: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="touch-target pressable flex items-center gap-3 rounded-2xl border border-line bg-panel px-5 py-3 text-lg font-semibold"
    >
      <span
        className={cn(
          'relative h-7 w-12 rounded-full transition',
          checked ? 'bg-accent' : 'bg-line',
        )}
      >
        <span
          className={cn(
            'absolute top-1 h-5 w-5 rounded-full bg-white transition-all',
            checked ? 'left-6' : 'left-1',
          )}
        />
      </span>
      {label}
    </button>
  )
}

function QuickDate({ onPick }: { onPick: (date: Date) => void }) {
  return (
    <div className="flex gap-2">
      {[
        { label: 'Today', offset: 0 },
        { label: 'Tomorrow', offset: 1 },
      ].map(({ label, offset }) => (
        <button
          key={label}
          type="button"
          onClick={() => onPick(addDays(new Date(), offset))}
          className="touch-target pressable rounded-2xl border border-line bg-panel px-5 py-3 text-lg font-semibold text-muted"
        >
          {label}
        </button>
      ))}
    </div>
  )
}
