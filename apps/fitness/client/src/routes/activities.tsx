/**
 * Activities tab: 3-month calendar on top, quick-log chips below,
 * admin controls at the bottom for admins. The route owns the selected day so
 * tapping a past tile repoints the quick-log chips at that date.
 */

import { useState } from 'react'
import { NavPills, TopBar } from '../components/Chrome'
import { ActivityCalendar } from '../components/ActivityCalendar'
import { QuickLog } from '../components/QuickLog'
import { AdminSection } from '../components/AdminSection'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { todayKey } from '../lib/dates'

export function Activities() {
  const { user, getProfileJwt } = useLocalFirstAuth()
  // Shared by the calendar and the quick-log card: null = editing today
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  return (
    <>
      <TopBar
        home
        left={<h1 className="font-display text-[20px] font-bold tracking-tight">Activities</h1>}
        right={<NavPills />}
      />
      <div className="page-col px-5 pb-8">
        <ActivityCalendar selectedDay={selectedDay} onSelectDay={setSelectedDay} />
        <QuickLog date={selectedDay ?? todayKey()} onBackToToday={() => setSelectedDay(null)} />
        {user?.isAdmin && <AdminSection getProfileJwt={getProfileJwt} onReset={() => {}} />}
      </div>
    </>
  )
}
