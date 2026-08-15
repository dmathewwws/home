interface FilterChipsProps<K extends string> {
  options: Array<{ key: K; label: string }>
  active: K
  onChange: (key: K) => void
  className?: string
}

export function FilterChips<K extends string>({ options, active, onChange, className = '' }: FilterChipsProps<K>) {
  return (
    <div className={`flex gap-[7px] overflow-x-auto no-scrollbar -mx-5 px-5 pt-0.5 pb-4 ${className}`}>
      {options.map((opt) => (
        <button
          key={opt.key}
          type="button"
          className="chip"
          aria-pressed={opt.key === active}
          onClick={() => onChange(opt.key)}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
