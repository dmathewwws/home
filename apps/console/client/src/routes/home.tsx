import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MANAGED_APPS } from '@home/console-shared'
import { cardForManagedApp, settingsCard, type AppCard } from '../lib/appCards'
import { getMyApps, type MyApps } from '../lib/memberApi'
import { syncProfileToDatabase } from '../lib/userApi'

/** Card classes shared by external (cross-document) and internal (host route) links. */
const cardClasses =
  'card group block h-full p-6 transition-all hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'

export function Home() {
  // The grid shows the apps the caller is a member of (admins see all); /settings stays
  // open so a visitor can create the profile an operator then approves. null = resolving.
  const [myApps, setMyApps] = useState<MyApps | null>(null)

  useEffect(() => {
    let cancelled = false
    getMyApps().then((result) => {
      if (!cancelled) setMyApps(result)
      // Best-effort registration so an admin has a users row to approve: native-host
      // (Antler) users land here and never pass through a profile editor. Runs after
      // getMyApps(), which restores window.localFirstAuth for web users.
      if (result.kind !== 'signed-out') void syncProfileToDatabase()
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (myApps === null) {
    return (
      <div className="w-full max-w-5xl mx-auto px-4 py-12 sm:py-16 text-center text-sm text-gray-400">
        Loading…
      </div>
    )
  }

  if (myApps.kind === 'signed-out') return <MembersOnly signedOut />
  if (myApps.slugs.length === 0 && !myApps.isAdmin) return <MembersOnly signedOut={false} />

  // Join the caller's slugs against the shared registry for display metadata; Settings
  // is always appended so every member/admin can reach their profile.
  const gridApps: AppCard[] = [
    ...myApps.slugs.flatMap((slug) => {
      const app = MANAGED_APPS.find((a) => a.slug === slug)
      return app ? [cardForManagedApp(app)] : []
    }),
    settingsCard,
  ]
  const hasMiniApps = gridApps.some((app) => !app.internal)

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-12 sm:py-16">
      <header className="text-center mb-10 sm:mb-14">
        <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-gray-900">
          Welcome to Home
        </h1>
      </header>

      {!hasMiniApps && (
        <div className="card p-10 text-center text-gray-500 mb-5">
          <p className="text-lg font-semibold text-gray-700">No mini apps yet</p>
          <p className="mt-2 text-sm">
            Scaffold one with <code className="font-mono">pnpm new-app &lt;slug&gt;</code>, then
            register it (card metadata included) in{' '}
            <code className="font-mono">shared/src/apps.ts</code> — see{' '}
            <code className="font-mono">docs/hosting-a-mini-app.md</code>.
          </p>
        </div>
      )}

      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {gridApps.map((app) => (
          <li key={app.slug}>
            {/* Internal cards (e.g. Settings) are host routes → client-side Link.
                External cards are separate Workers/documents → real anchor so the
                browser does a full navigation. */}
            {app.internal ? (
              <Link to={app.path} className={cardClasses}>
                <CardBody app={app} />
              </Link>
            ) : (
              <a href={app.path} className={cardClasses}>
                <CardBody app={app} />
              </a>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

/** Gate screen for signed-out visitors and signed-in users with no app memberships. */
function MembersOnly({ signedOut }: { signedOut: boolean }) {
  return (
    <div className="w-full max-w-lg mx-auto px-4 py-16 sm:py-24 text-center">
      <div className="card p-10">
        <p className="text-4xl" aria-hidden="true">
          🔒
        </p>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-gray-900">Members only</h1>
        {signedOut ? (
          <p className="mt-3 text-sm text-gray-500">
            Create your profile in Settings to get started — an admin can then make you a
            member.
          </p>
        ) : (
          <p className="mt-3 text-sm text-gray-500">
            Profile created — ask an admin to make you a member of an app, then come back
            here.
          </p>
        )}
        <Link to="/settings" className="btn-primary mt-6 inline-block px-5 py-2 text-sm">
          Go to Settings
        </Link>
      </div>
    </div>
  )
}

/** Shared inner markup for both internal and external app cards. */
function CardBody({ app }: { app: AppCard }) {
  return (
    <>
      <div
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${app.accent} text-3xl shadow-sm`}
      >
        <span aria-hidden="true">{app.icon}</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 group-hover:text-primary">
        {app.name}
      </h2>
      <p className="mt-1 text-sm text-gray-500">{app.description}</p>
    </>
  )
}
