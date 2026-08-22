/**
 * Back out of this mini app to the host console's landing grid at the zone root.
 *
 * This has to be a plain anchor doing a full cross-document navigation: the
 * console is a separate Worker, and a react-router <Link to="/"> would resolve
 * against the router basename (`/__SLUG__/`) and land back on this app's own
 * root instead. In dev the console's Vite server is on :5173 (strictPort),
 * while this app runs on its own port.
 */
const HOME_HREF = import.meta.env.DEV ? 'http://localhost:5173/' : '/'

export function HomeButton() {
  return (
    <a
      href={HOME_HREF}
      aria-label="Back to home"
      title="Back to home"
      className="flex-none text-gray-400 hover:text-gray-700 transition-colors"
    >
      <svg
        viewBox="0 0 24 24"
        className="w-[22px] h-[22px]"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M19 12H5M12 19l-7-7 7-7" />
      </svg>
    </a>
  )
}
