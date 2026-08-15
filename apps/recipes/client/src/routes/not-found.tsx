import { Link } from 'react-router-dom'

export function NotFound() {
  return (
    <div className="flex-1 flex flex-col justify-center px-5 pb-24 page-col">
      <span className="tape self-start mb-5">Lost</span>
      <h1 className="h-display text-[34px]">Nothing filed here</h1>
      <p className="mt-4 text-[15.5px] leading-normal text-muted">
        This page isn't in the box — it may have been moved or never existed.
      </p>
      <Link to="/" className="mono-link self-start mt-8">
        Back to the recipes
      </Link>
    </div>
  )
}
