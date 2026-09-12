import { useMemo, useState } from 'react'
import { Avatar } from '@/components/Avatar'
import { TrophyIcon } from '@/components/Icons'
import { useMemberMap, useMembers, usePoints } from '@/data'
import { addDays, formatRelativeDay, startOfDay, startOfWeek } from '@/lib/dates'
import { memberColor, readableInk, tint } from '@/lib/colors'
import { cn } from '@/lib/cn'

type Window = 'week' | 'month' | 'all'

const WINDOWS: Array<{ id: Window; label: string }> = [
  { id: 'week', label: 'This week' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'all', label: 'All time' },
]

const MEDALS = ['🥇', '🥈', '🥉']

export function RewardsView() {
  const members = useMembers()
  const memberMap = useMemberMap()
  const entries = usePoints()
  const [window, setWindow] = useState<Window>('week')

  const since = useMemo(() => {
    if (window === 'week') return startOfWeek(new Date())
    if (window === 'month') return startOfDay(addDays(new Date(), -30))
    return new Date(0)
  }, [window])

  const inWindow = entries.filter((entry) => new Date(entry.earnedAt) >= since)

  // Children are the leaderboard's audience; grown-ups' chores don't compete.
  const contenders = members.filter((member) => member.isChild)
  const board = (contenders.length > 0 ? contenders : members)
    .map((member) => ({
      member,
      total: inWindow
        .filter((entry) => entry.memberId === member.id)
        .reduce((sum, entry) => sum + entry.points, 0),
    }))
    .sort((a, b) => b.total - a.total || a.member.name.localeCompare(b.member.name))

  const best = Math.max(...board.map((row) => row.total), 1)
  const recent = [...inWindow]
    .sort((a, b) => b.earnedAt.localeCompare(a.earnedAt))
    .slice(0, 12)

  return (
    <div className="flex h-full flex-col gap-5 px-4 pt-5 pb-6 lg:px-8">
      <header className="flex items-center gap-4">
        <h1 className="flex items-center gap-3 text-4xl font-black tracking-tight">
          <TrophyIcon className="h-10 w-10 text-amber-400" />
          Points
        </h1>
        <div className="ml-auto flex rounded-2xl border border-line bg-panel p-1">
          {WINDOWS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              onClick={() => setWindow(entry.id)}
              className={cn(
                'touch-target rounded-xl px-5 py-2.5 text-lg font-bold transition',
                window === entry.id ? 'bg-accent text-white' : 'text-muted',
              )}
            >
              {entry.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 lg:grid-cols-[1fr_24rem]">
        <section className="card no-scrollbar min-h-0 space-y-3 overflow-y-auto p-6">
          {board.length === 0 ? (
            <p className="py-12 text-center text-xl text-muted">
              Add family members to start keeping score.
            </p>
          ) : (
            board.map((row, index) => {
              const color = memberColor(row.member.color)
              return (
                <div
                  key={row.member.id}
                  className="flex items-center gap-4 rounded-3xl border border-line bg-panel/50 p-4"
                >
                  <span className="w-10 shrink-0 text-center text-3xl">
                    {row.total > 0 && index < MEDALS.length ? (
                      MEDALS[index]
                    ) : (
                      <span className="text-2xl font-black text-muted">{index + 1}</span>
                    )}
                  </span>
                  <Avatar member={row.member} size="lg" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-3">
                      <span className="truncate text-2xl font-black">{row.member.name}</span>
                      <span
                        className="ml-auto text-3xl font-black tabular-nums"
                        style={{ color: readableInk(row.member.color) }}
                      >
                        {row.total}
                      </span>
                    </div>
                    <div className="mt-2 h-3 overflow-hidden rounded-full bg-line">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.round((row.total / best) * 100)}%`,
                          backgroundColor: color.hex,
                        }}
                      />
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </section>

        <section className="card flex min-h-0 flex-col p-6">
          <h2 className="mb-3 text-2xl font-bold">Recently earned</h2>
          <div className="no-scrollbar min-h-0 flex-1 space-y-2 overflow-y-auto">
            {recent.length === 0 ? (
              <p className="py-8 text-lg text-muted">
                No points yet in this window. Finish a chore to get on the board.
              </p>
            ) : (
              recent.map((entry) => {
                const member = memberMap.get(entry.memberId)
                return (
                  <div
                    key={entry.id}
                    className="flex items-center gap-3 rounded-2xl bg-panel/60 px-3 py-2.5"
                  >
                    {member && <Avatar member={member} size="sm" />}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-lg font-semibold">{entry.reason}</p>
                      <p className="text-sm text-muted">
                        {formatRelativeDay(new Date(entry.earnedAt))}
                      </p>
                    </div>
                    <span
                      className="shrink-0 rounded-full px-3 py-1 text-lg font-black"
                      style={{
                        backgroundColor: tint(member?.color, 0.18),
                        color: readableInk(member?.color),
                      }}
                    >
                      +{entry.points}
                    </span>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  )
}
