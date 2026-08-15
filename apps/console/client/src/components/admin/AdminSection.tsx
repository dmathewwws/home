/**
 * Admin console, rendered inside Settings below the profile.
 *
 * Self-gating: on mount it asks the host (`GET /api/admin/status`) whether the current
 * user is an operator and renders nothing unless they are. This is a visibility gate
 * only — every admin endpoint independently re-verifies the caller server-side.
 */
import { useEffect, useState } from 'react'
import { HOST_APP_SLUG } from '@home/console-shared'
import { apps, type MiniApp } from '../../apps'
import { adminApi } from '../../lib/adminApi'
import { AdminAppCard } from './AdminAppCard'

/**
 * Synthetic card for the host's own D1 (landing-grid membership + operators). Not in
 * the landing-grid registry — the server resolves this reserved slug to its own DB.
 */
const hostApp: MiniApp = {
  slug: HOST_APP_SLUG,
  name: 'Home (console)',
  description: 'Landing-grid membership and operators.',
  path: '/',
  icon: '🏠',
  accent: 'from-slate-400 to-slate-300',
  internal: true,
}

export function AdminSection() {
  // null = still resolving; false = not an admin; true = show the console.
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  useEffect(() => {
    let cancelled = false
    adminApi.getStatus().then((r) => {
      if (!cancelled) setIsAdmin(r.ok ? r.data.isAdmin : false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!isAdmin) return null

  const managed = [hostApp, ...apps.filter((a) => !a.internal)]

  return (
    <section className="mt-12 pt-8 border-t border-gray-200">
      <h2 className="text-2xl font-semibold text-gray-900">Admin</h2>
      <p className="mt-1 mb-5 text-sm text-gray-500">
        Manage users across mini apps — grant or revoke membership and admin, block, or
        remove.
      </p>
      <div className="space-y-4">
        {managed.map((a) => (
          <AdminAppCard key={a.slug} app={a} />
        ))}
      </div>
    </section>
  )
}
