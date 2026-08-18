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
      <div className="min-h-screen bg-bg flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-6">⚠️</div>
          <h1 className="font-display text-[20px] font-bold tracking-tight mb-4">Error</h1>
          <p className="text-ink-2">{error}</p>
        </div>
      </div>
    )
  }

  return (
    <>
      <Outlet />

      {/* Onboarding modal */}
      {isOnboardingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
            onClick={() => setIsOnboardingModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-lg mx-4 max-h-[90vh] overflow-auto rounded-3xl border border-line shadow-[0_2px_12px_rgba(0,0,0,0.08)]">
            <Onboarding skipSocialStep={true} onComplete={handleOnboardingComplete} />
          </div>
        </div>
      )}

      {/* Reset modal */}
      {resetMessage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px]" />
          <div className="relative z-10 card shadow-[0_2px_12px_rgba(0,0,0,0.08)] p-8 max-w-md mx-4 text-center">
            <h2 className="font-display text-[18px] font-bold tracking-tight mb-4">Admin Reset</h2>
            <p className="text-ink-2">{resetMessage}</p>
            <button
              onClick={() => setResetMessage(null)}
              className="btn-primary mt-6 px-6 py-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  )
}

export function App() {
  return (
    <AuthProvider>
      <Layout />
    </AuthProvider>
  )
}
