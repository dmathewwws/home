import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="w-full text-center py-12 rise">
      <div className="card p-8">
        <div className="text-5xl mb-4">🔍</div>
        <h1 className="display-title text-[24px] mb-2">Page not found</h1>
        <p className="text-muted mb-6 text-[14px]">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Link to="/" className="btn-log inline-block !w-auto px-6">
          Back to Today
        </Link>
      </div>
    </div>
  )
}
