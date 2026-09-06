import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Onboarding } from 'local-first-auth/react'
import { AuthProvider, useLocalFirstAuth } from './hooks/useLocalFirstAuth'
import { HobbyDataProvider } from './hooks/useHobbyData'
import { Footer } from './components/Footer'
import { HomeButton } from './components/HomeButton'
import { NavPills, TabNav } from './components/TabNav'
import { ToastProvider } from './components/Toast'

/**
 * Members-only waiting screen. Membership is granted from the host console (it
 * writes our D1 directly, so no WebSocket fires) — poll until the grant shows up.
 */
function WaitingForMembership() {
  const { user, refreshUser } = useLocalFirstAuth()

  useEffect(() => {
    const interval = setInterval(refreshUser, 30_000)
    return () => clearInterval(interval)
  }, [refreshUser])

  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-md rise">
        <div className="text-5xl mb-6">🔒</div>
        <div className="eyebrow">Members only</div>
        <h1 className="display-title mt-2 mb-4">Almost in</h1>
        <p className="text-ink-soft text-[14.5px]">
          {user?.name ? `${user.name}, ask` : 'Ask'} an admin to approve you in the
          host console — this page checks again every half minute, no refresh needed.
        </p>
      </div>
    </div>
  )
}

/** Logged-out hero: what the app is, and the door in. */
function SignedOutHero() {
  const { setIsOnboardingModalOpen } = useLocalFirstAuth()
  return (
    <div className="flex-1 flex items-center justify-center px-6 py-16">
      <div className="text-center max-w-md rise">
        <div className="eyebrow">Hobbies</div>
        <h1 className="display-title mt-2 mb-4">A home for your hobbies</h1>
        <p className="text-ink-soft text-[14.5px] mb-8">
          Log what you practiced or made today, keep your lesson links one tap
          away, and watch twelve weeks of making fill in — one pastel tile at a
          time.
        </p>
        <button className="btn-log !w-auto px-8" onClick={() => setIsOnboardingModalOpen(true)}>
          Add yourself
        </button>
      </div>
    </div>
  )
}

function Layout() {
  const {
    user,
    loading,
    error,
    isOnboardingModalOpen,
    resetMessage,
    setIsOnboardingModalOpen,
    setResetMessage,
    handleOnboardingComplete,
  } = useLocalFirstAuth()

  const isMember = !!user && (user.isMember || user.isAdmin)
  const isWaiting = !!user && !isMember

  return (
    <ToastProvider>
      <div className="shell">
        <div className="page-col flex items-center px-5 pt-5">
          <HomeButton />
          {!loading && !error && isMember && <NavPills />}
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center text-muted">Loading…</div>
        ) : error ? (
          <div className="flex-1 flex items-center justify-center px-6 text-center">
            <div>
              <div className="text-5xl mb-6">⚠️</div>
              <h1 className="display-title mb-4">Error</h1>
              <p className="text-ink-soft">{error}</p>
            </div>
          </div>
        ) : isWaiting ? (
          <WaitingForMembership />
        ) : !user ? (
          <SignedOutHero />
        ) : (
          <HobbyDataProvider>
            <main className="page-col flex-1 px-5 pt-[14px] pb-[108px] md:pb-8">
              <Outlet />
              <Footer />
            </main>
            <TabNav />
          </HobbyDataProvider>
        )}
      </div>

      {/* Onboarding modal */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOnboardingModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-auto rounded-2xl shadow-2xl">
            <Onboarding
              skipSocialStep={true}
              onComplete={handleOnboardingComplete}
            />
          </div>
        </div>
      )}

      {/* Reset Modal */}
      {resetMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 card shadow-xl p-8 max-w-md mx-4 text-center">
            <h2 className="font-display text-2xl font-bold mb-4">Admin Reset</h2>
            <p className="text-ink-soft">{resetMessage}</p>
            <button className="btn-log mt-6 !w-auto px-6" onClick={() => setResetMessage(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </ToastProvider>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}
