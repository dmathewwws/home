/**
 * Activities tab: 3-month calendar on top, quick-log chips below,
 * admin controls at the bottom for admins.
 */

import { NavPills, TopBar } from '../components/Chrome'
import { ActivityCalendar } from '../components/ActivityCalendar'
import { QuickLog } from '../components/QuickLog'
import { AdminSection } from '../components/AdminSection'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'

export function Activities() {
  const { user, getProfileJwt } = useLocalFirstAuth()

  return (
    <>
      <TopBar
        left={<h1 className="font-display text-[20px] font-bold tracking-tight">Activities</h1>}
        right={<NavPills />}
      />
      <div className="page-col px-5 pb-8">
        <ActivityCalendar />
        <QuickLog />
        {user?.isAdmin && <AdminSection getProfileJwt={getProfileJwt} onReset={() => {}} />}
      </div>
    </>
  )
}
