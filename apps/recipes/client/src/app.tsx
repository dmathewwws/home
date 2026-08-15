import { Outlet } from 'react-router-dom'
import { Onboarding } from 'local-first-auth/react'
import { AuthProvider, useLocalFirstAuth } from './hooks/useLocalFirstAuth'
import { QRCodePanel } from './components/QRCodePanel'

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
      <div className="min-h-screen bg-backdrop">
        <div className="grid md:grid-cols-2 min-h-screen">
          <QRCodePanel />
          <div className="flex items-center justify-center px-4">
            <div className="text-center max-w-md text-kraft">
              <h1 className="h-display text-3xl mb-4">Something's off</h1>
              <p className="text-kraft-deep">{error}</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Desktop: QR panel left, phone frame right. Mobile: just the phone frame.
  return (
    <div className="min-h-screen bg-backdrop">
      <div className="grid md:grid-cols-2 min-h-screen">
        <QRCodePanel />
        <div className="flex flex-col">
          <main className="flex-1 flex flex-col">
            <Outlet />
          </main>
        </div>
      </div>

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
