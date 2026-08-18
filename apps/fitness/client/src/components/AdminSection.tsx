import { useState } from 'react'

interface AdminSectionProps {
  getProfileJwt: () => Promise<string | undefined>
  onReset: () => void
}

export function AdminSection({ getProfileJwt, onReset }: AdminSectionProps) {
  const [message, setMessage] = useState('Thanks for joining! See you next time.')
  const [isResetting, setIsResetting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const handleReset = async () => {
    const profileJwt = await getProfileJwt()
    if (!profileJwt) {
      setError('No profile JWT available')
      return
    }

    setIsResetting(true)
    setError(null)

    try {
      const response = await fetch(`${import.meta.env.BASE_URL}api/reset`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profileJwt, message }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to reset')
      }

      onReset()
    } catch (err) {
      console.error('Error resetting:', err)
      setError(err instanceof Error ? err.message : 'Failed to reset')
    } finally {
      setIsResetting(false)
      setShowConfirm(false)
    }
  }

  return (
    <div className="mt-12 rounded-3xl border border-line bg-white overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-inset transition-colors"
      >
        <h3 className="text-[14px] font-semibold text-down">Admin Controls</h3>
        <svg
          className={`w-4 h-4 text-ink-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <div
        className={`grid transition-all duration-200 ease-in-out ${
          isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden">
          <div className="px-4 pb-4 pt-4 space-y-4 bg-inset border-t border-line-2">
            <div>
              <label className="block text-[12px] font-semibold uppercase tracking-wide text-ink-2 mb-2">
                Reset Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-2xl border border-input bg-white px-3 py-[10px] text-sm text-ink outline-none focus:border-ink"
                rows={3}
                placeholder="Message to show all attendees..."
              />
            </div>

            {error && (
              <div className="rounded-2xl border border-danger-line bg-danger-bg px-3 py-2 text-[13px] text-down">
                {error}
              </div>
            )}

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full px-4 py-2 rounded-full border border-danger-line bg-white text-[13px] font-semibold text-down hover:border-down transition-colors"
              >
                Reset
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-[13px] font-medium text-down">
                  Are you sure? This will remove all non-admin users.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleReset}
                    disabled={isResetting}
                    className="flex-1 px-4 py-2 rounded-full bg-down text-white text-[13px] font-semibold hover:opacity-90 disabled:bg-input disabled:text-ink-3 transition-colors"
                  >
                    {isResetting ? 'Resetting...' : 'Yes, Reset'}
                  </button>
                  <button
                    onClick={() => setShowConfirm(false)}
                    className="flex-1 px-4 py-2 rounded-full border border-line-btn bg-white text-[13px] font-semibold text-ink-2 hover:border-ink transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
