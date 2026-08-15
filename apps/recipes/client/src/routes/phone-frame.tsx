/**
 * Phone-frame layout route wrapping every screen: a 412px-max kraft column
 * with paper grain, holding the household gate — logged-out visitors get the
 * onboarding trigger, signed-in non-members get the waiting screen, members
 * get the app.
 */

import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { useLocalFirstAuth } from '../hooks/useLocalFirstAuth'

function GateScreen({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex-1 flex flex-col justify-center px-5 pb-24">{children}</div>
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
        className="save-btn mt-8 md:hidden"
      >
        Add yourself
      </button>
      <p className="eyebrow mt-8 hidden md:block">Scan the code with Antler Browser to join</p>
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

export function PhoneFrame() {
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
    <div className="relative mx-auto w-full max-w-[412px] h-dvh bg-kraft overflow-hidden flex flex-col paper-grain shadow-[0_0_0_1px_#0006,0_30px_90px_-20px_#000a]">
      {content}
    </div>
  )
}
