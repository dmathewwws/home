import { Outlet } from 'react-router-dom'
import { Onboarding } from 'local-first-auth/react'
import { AuthProvider, useLocalFirstAuth } from './hooks/useLocalFirstAuth'

function Layout() {
  const {
    error,
    isOnboardingModalOpen,
    resetMessage,
    setIsOnboardingModalOpen,
    setResetMessage,
    handleOnboardingComplete,
  } = useLocalFirstAuth()

  if (error) {
    return (
      <div className="relative min-h-dvh bg-kraft paper-grain flex items-center justify-center px-5">
        <div className="page-col max-w-md flex flex-col items-center text-center">
          <span className="tape mb-5">Well.</span>
          <h1 className="h-display text-3xl mb-4 text-ink">Something's off</h1>
          <p className="text-muted">{error}</p>
        </div>
      </div>
    )
  }

  // The app-shell route owns all visual framing (kraft bg, grain, header).
  return (
    <div className="min-h-dvh">
      <Outlet />

      {/* Onboarding modal */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
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
        <div className="fixed inset-0 z-[70] flex items-center justify-center">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative z-10 bg-kraft border-2 border-ink shadow-xl p-8 max-w-md mx-4 text-center">
            <h2 className="h-display text-2xl mb-4">Admin reset</h2>
            <p className="text-muted">{resetMessage}</p>
            <button
              onClick={() => setResetMessage(null)}
              className="save-btn mt-6 !w-auto px-8"
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
