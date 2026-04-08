'use client';

export interface SearchFilterValues {
  category: string;
  dateFrom: string;
  dateTo: string;
}

const CATEGORIES = ['', 'AI/ML', 'Architecture', 'Security', 'DevOps', 'Data Engineering'];
const YEARS = ['', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

interface PillSelectProps {
  id: string;
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
  disabled?: boolean;
}

function PillSelect({ id, label, value, options, onChange, disabled }: PillSelectProps) {
  const isActive = value !== '';
  return (
    <div className="relative inline-flex items-center">
      <label htmlFor={id} className="sr-only">{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={[
          'appearance-none rounded-full border px-3 py-1 pr-6 text-xs font-medium cursor-pointer transition-all',
          'focus:outline-none focus:ring-2 focus:ring-[var(--color-primary-300)]',
          isActive
            ? 'border-[var(--color-primary-400)] bg-[var(--color-primary-50)] text-[var(--color-primary-700)]'
            : 'border-[var(--color-neutral-200)] bg-white text-[var(--color-neutral-500)] hover:border-[var(--color-neutral-300)] hover:text-[var(--color-neutral-700)]',
          disabled ? 'opacity-50 cursor-not-allowed' : '',
        ].join(' ')}
      >
        <option value="">{label}</option>
        {options.slice(1).map((opt) => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      {/* Chevron */}
      <svg
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[var(--color-neutral-400)]"
        fill="none"
        viewBox="0 0 12 12"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5l3 3 3-3" />
      </svg>
    </div>
  );
}

interface SearchFiltersProps {
  filters: SearchFilterValues;
  onChange: (filters: SearchFilterValues) => void;
  disabled?: boolean;
}

export function SearchFilters({ filters, onChange, disabled = false }: SearchFiltersProps) {
  const isActive = filters.category !== '' || filters.dateFrom !== '' || filters.dateTo !== '';

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <PillSelect
        id="filter-category"
        label="Category"
        value={filters.category}
        options={CATEGORIES.map((c) => ({ value: c, label: c || 'Category' }))}
        onChange={(v) => onChange({ ...filters, category: v })}
        disabled={disabled}
      />
      <PillSelect
        id="filter-date-from"
        label="From"
        value={filters.dateFrom}
        options={YEARS.map((y) => ({ value: y, label: y || 'From year' }))}
        onChange={(v) => onChange({ ...filters, dateFrom: v })}
        disabled={disabled}
      />
      <PillSelect
        id="filter-date-to"
        label="To"
        value={filters.dateTo}
        options={YEARS.map((y) => ({ value: y, label: y || 'To year' }))}
        onChange={(v) => onChange({ ...filters, dateTo: v })}
        disabled={disabled}
      />
      {isActive && (
        <button
          type="button"
          onClick={() => onChange({ category: '', dateFrom: '', dateTo: '' })}
          disabled={disabled}
          className="rounded-full border border-[var(--color-neutral-200)] bg-white px-3 py-1 text-xs text-[var(--color-neutral-400)] hover:text-[var(--color-neutral-600)] hover:border-[var(--color-neutral-300)] transition-all"
        >
          Clear
        </button>
      )}
    </div>
  );
}
