import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="w-full max-w-md mx-auto text-center py-12 px-5">
      <div className="card p-8">
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="font-display text-[20px] font-bold tracking-tight mb-2">Page Not Found</h1>
        <p className="text-ink-2 mb-6">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="inline-block btn-primary px-6 py-3">
          Go Home
        </Link>
      </div>
    </div>
  )
}
