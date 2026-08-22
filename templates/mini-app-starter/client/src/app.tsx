import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Onboarding } from 'local-first-auth/react'
import { AuthProvider, useLocalFirstAuth } from './hooks/useLocalFirstAuth'
import { Footer } from './components/Footer'
import { HomeButton } from './components/HomeButton'

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
    <div className="flex-1 flex flex-col px-4">
      <div className="page-col w-full pt-6">
        <HomeButton />
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">🔒</div>
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Members only</h1>
          <p className="text-gray-600">
            {user?.name ? `${user.name}, ask` : 'Ask'} an admin to approve you in the
            host console — this page checks again every half minute, no refresh needed.
          </p>
        </div>
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

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gradient-start to-gradient-end flex items-center justify-center px-4">
        <div className="text-gray-500">Loading...</div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 to-orange-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="text-3xl font-bold mb-4 text-gray-800">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    )
  }

  // Members-only gate: signed-in non-members wait here (signed-out visitors keep
  // the normal onboarding flow inside the routes).
  const isWaiting = user && !user.isMember && !user.isAdmin

  // Main layout with routes: full-bleed gradient page, content in a centered column.
  return (
    <div className="min-h-screen bg-gradient-to-br from-gradient-start to-gradient-end flex flex-col">
      {isWaiting ? (
        <WaitingForMembership />
      ) : (
        <div className="page-col flex-1 flex flex-col px-4 py-8">
          <div className="mb-6">
            <HomeButton />
          </div>
          <main className="flex-1">
            <Outlet />
          </main>
          <Footer />
        </div>
      )}

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
          <div className="relative z-10 bg-card rounded-lg shadow-xl p-8 max-w-md mx-4 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Admin Reset</h2>
            <p className="text-gray-600">{resetMessage}</p>
            <button
              onClick={() => setResetMessage(null)}
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
            >
              Close
            </button>
          </div>
        </div>
      )}

      
    </div>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}
