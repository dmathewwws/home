/** Search strip: bordered box with a magnifier and a clear button. */

interface SearchBoxProps {
  value: string
  onChange: (value: string) => void
  placeholder: string
  className?: string
}

export function SearchBox({ value, onChange, placeholder, className = '' }: SearchBoxProps) {
  return (
    <div className={`flex items-center gap-[9px] border border-rule bg-kraft-lift px-3 py-2.5 ${className}`}>
      <svg viewBox="0 0 24 24" className="w-[15px] h-[15px] flex-none text-muted" fill="none" stroke="currentColor" strokeWidth={2}>
        <circle cx="11" cy="11" r="7" />
        <path d="M20 20l-4-4" />
      </svg>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className="flex-1 min-w-0 bg-transparent font-mono2 text-[13px] text-ink placeholder:text-muted outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {value && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => onChange('')}
          className="font-mono2 text-[13px] leading-none text-muted flex-none px-0.5"
        >
          &times;
        </button>
      )}
    </div>
  )
}
