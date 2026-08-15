/**
 * App-shell layout route wrapping every screen: a full-viewport kraft column
 * with paper grain, holding the household gate — logged-out visitors get the
 * onboarding trigger, signed-in non-members get the waiting screen, members
 * get the app. Content aligns to a centered .page-col; the desktop AppHeader
 * (brand + nav pills) sits above everything, outside the scroll containers.
 */

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { AppHeader } from '../components/Chrome'

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-5 pb-24 page-col">{children}</div>
  )
}

function LoggedOut() {
  const { setIsOnboardingModalOpen } = useLocalFirstAuth()
  return (
    <GateScreen>
      <span className="tape self-start mb-5">Household only</span>
      <h1 className="h-display text-[42px]">Recipe&nbsp;Box</h1>
      <p className="mt-4 text-[15.5px] leading-normal text-muted">
        The recipes this house actually cooks, broken into cards you can read
        with wet hands — and a journal of how each cook went.
      </p>
      <button
        type="button"
        onClick={() => setIsOnboardingModalOpen(true)}
        className="save-btn mt-8 md:self-start md:!w-auto md:px-10"
      >
        Add yourself
      </button>
    </GateScreen>
  )
}

function Waiting() {
  const { user, refreshUser } = useLocalFirstAuth()

  // Membership is granted from the host console (it writes our D1 directly,
  // so no WebSocket fires) — poll until the grant shows up.
  useEffect(() => {
    const interval = setInterval(refreshUser, 30_000)
    return () => clearInterval(interval)
  }, [refreshUser])

  return (
    <GateScreen>
      <span className="tape self-start mb-5">Almost in</span>
      <h1 className="h-display text-[34px]">Waiting to be let&nbsp;in</h1>
      <p className="mt-4 text-[15.5px] leading-normal text-muted">
        {user?.name ? `${user.name}, this` : 'This'} box belongs to the
        household. Ask an admin to let you in — once they do, the recipes
        appear right here.
      </p>
      <div className="mt-8 border-t border-rule pt-4">
        <span className="eyebrow">Checks again every half minute &middot; no refresh needed</span>
      </div>
    </GateScreen>
  )
}

export function AppShell() {
  const { user, loading } = useLocalFirstAuth()

  let content: React.ReactNode
  if (loading) {
    content = (
      <GateScreen>
        <span className="eyebrow">Opening the box&hellip;</span>
      </GateScreen>
    )
  } else if (!user) {
    content = <LoggedOut />
  } else if (!user.isMember && !user.isAdmin) {
    content = <Waiting />
  } else {
    content = <Outlet />
  }

  return (
    <div className="relative w-full h-dvh bg-kraft overflow-hidden flex flex-col paper-grain">
      <AppHeader />
      {content}
    </div>
  )
}
