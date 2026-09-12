import { useCallback, useEffect, useState } from 'react'
import { NavRail, type ViewId } from '@/components/NavRail'
import { repo, useSettings } from '@/data'
import { seedIfEmpty } from '@/data/seed'
import { useTheme } from '@/lib/useTheme'
import { useIdle } from '@/lib/useIdle'
import { TodayView } from '@/features/today/TodayView'
import { CalendarView } from '@/features/calendar/CalendarView'
import { ChoresView } from '@/features/chores/ChoresView'
import { MealsView } from '@/features/meals/MealsView'
import { RewardsView } from '@/features/rewards/RewardsView'
import { FamilyView } from '@/features/family/FamilyView'
import { SettingsView } from '@/features/settings/SettingsView'
import { Screensaver } from '@/features/screensaver/Screensaver'

export default function App() {
  const settings = useSettings()
  const [view, setView] = useState<ViewId>('today')
  const [ready, setReady] = useState(false)
  const [startupError, setStartupError] = useState<string | null>(null)

  useTheme(settings)

  useEffect(() => {
    // Seed a first-run household, then re-open any recurring chores whose day
    // has rolled over since the display was last touched.
    void (async () => {
      try {
        await repo.getSettings()
        await seedIfEmpty()
        await repo.rolloverRecurringTodos()
        setReady(true)
      } catch (error) {
        // Private browsing and blocked site data both make IndexedDB throw.
        // Say so, rather than sitting on the loading screen forever.
        console.error('Could not open the planner database.', error)
        setStartupError(
          error instanceof Error ? error.message : 'Could not open local storage.',
        )
      }
    })()
  }, [])

  // A wall display stays on for weeks; re-check the chore rollover at each
  // local midnight so Monday's list is not still showing Sunday's state.
  useEffect(() => {
    const timer = window.setInterval(() => void repo.rolloverRecurringTodos(), 15 * 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const [idle, wake] = useIdle(settings.screensaverAfterMinutes * 60_000)

  const navigate = useCallback((next: ViewId) => {
    setView(next)
  }, [])

  // The rewards view can be switched off in Settings; don't strand the user on it.
  useEffect(() => {
    if (!settings.rewardsEnabled && view === 'rewards') setView('today')
  }, [settings.rewardsEnabled, view])

  if (startupError) {
    return (
      <div className="flex h-full items-center justify-center bg-bg p-10 text-center">
        <div className="max-w-xl space-y-3">
          <h1 className="text-3xl font-black">The planner can't reach its storage</h1>
          <p className="text-xl text-muted">
            This browser is blocking local storage, so there is nowhere to keep your
            calendar. Private browsing is the usual cause — try a normal window, or
            allow site data for this page.
          </p>
          <p className="text-base text-muted">{startupError}</p>
        </div>
      </div>
    )
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-bg text-2xl text-muted">
        Loading your planner…
      </div>
    )
  }

  return (
    <div className="flex h-full overflow-hidden bg-bg text-ink">
      <NavRail current={view} onNavigate={navigate} rewardsEnabled={settings.rewardsEnabled} />
      <main className="pb-safe pr-safe pt-safe flex-1 overflow-hidden">
        {view === 'today' && <TodayView onNavigate={navigate} />}
        {view === 'calendar' && <CalendarView />}
        {view === 'chores' && <ChoresView />}
        {view === 'meals' && <MealsView />}
        {view === 'rewards' && <RewardsView />}
        {view === 'family' && <FamilyView />}
        {view === 'settings' && <SettingsView />}
      </main>
      {idle && <Screensaver settings={settings} onWake={wake} />}
    </div>
  )
}
