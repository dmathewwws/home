/**
 * App-shell layout route wrapping every screen: a full-viewport off-white
 * column holding the members-only gate — logged-out visitors get the
 * onboarding trigger, signed-in non-members get the waiting screen, members
 * get the app. Content aligns to a centered .page-col.
 */

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'
import { HomeButton } from '../components/Chrome'

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-5 pb-24 page-col">{children}</div>
  )
}

function LoggedOut() {
  const { setIsOnboardingModalOpen } = useLocalFirstAuth()
  return (
    <GateScreen>
      <span className="eyebrow mb-3">Personal use</span>
      <h1 className="font-display text-[36px] font-bold tracking-tight leading-[1.05]">Fitness</h1>
      <p className="mt-4 text-[14px] leading-normal text-ink-2">
        A quiet log of what you did each day — the calendar fills in one colored
        tile at a time — plus a weight trend that keeps you honest.
      </p>
      <button
        type="button"
        onClick={() => setIsOnboardingModalOpen(true)}
        className="btn-primary mt-8 px-10 py-3 self-start text-[15px]"
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
      <span className="eyebrow mb-3">Almost in</span>
      <h1 className="font-display text-[30px] font-bold tracking-tight leading-[1.1]">
        Waiting to be let&nbsp;in
      </h1>
      <p className="mt-4 text-[14px] leading-normal text-ink-2">
        {user?.name ? `${user.name}, this` : 'This'} app is members-only. Ask an
        admin to let you in — once they do, your log appears right here.
      </p>
      <div className="mt-8 border-t border-line pt-4">
        <span className="eyebrow">Checks again every half minute &middot; no refresh needed</span>
      </div>
    </GateScreen>
  )
}

export function AppShell() {
  const { user, loading } = useLocalFirstAuth()

  // The gate screens render no TopBar, so they carry their own way back to the
  // console — otherwise a visitor who isn't a member is stuck on the wall.
  let content: React.ReactNode
  let gated = true
  if (loading) {
    content = (
      <GateScreen>
        <span className="eyebrow">Loading&hellip;</span>
      </GateScreen>
    )
  } else if (!user) {
    content = <LoggedOut />
  } else if (!user.isMember && !user.isAdmin) {
    content = <Waiting />
  } else {
    content = <Outlet />
    gated = false
  }

  return (
    <div className="relative w-full h-dvh bg-bg overflow-hidden flex flex-col">
      {gated && (
        <div className="page-col px-5 pt-6">
          <HomeButton />
        </div>
      )}
      {content}
    </div>
  )
}
