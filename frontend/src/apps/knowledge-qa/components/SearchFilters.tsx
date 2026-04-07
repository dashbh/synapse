'use client';

export interface SearchFilterValues {
  category: string;
  dateFrom: string;
  dateTo: string;
}

const CATEGORIES = ['', 'AI/ML', 'Architecture', 'Security', 'DevOps', 'Data Engineering'];

const YEARS = ['', '2020', '2021', '2022', '2023', '2024', '2025', '2026'];

interface SearchFiltersProps {
  filters: SearchFilterValues;
  onChange: (filters: SearchFilterValues) => void;
  disabled?: boolean;
}

export function SearchFilters({ filters, onChange, disabled = false }: SearchFiltersProps) {
  const isActive =
    filters.category !== '' || filters.dateFrom !== '' || filters.dateTo !== '';

  return (
    <div className="flex flex-wrap items-center gap-3">
      {/* Category */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-category" className="text-xs text-gray-500 shrink-0">
          Category
        </label>
        <select
          id="filter-category"
          value={filters.category}
          onChange={(e) => onChange({ ...filters, category: e.target.value })}
          disabled={disabled}
          className="text-xs rounded border border-gray-200 bg-white px-2 py-1 text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:opacity-50"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c || 'All categories'}
            </option>
          ))}
        </select>
      </div>

      {/* Date from */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-date-from" className="text-xs text-gray-500 shrink-0">
          From
        </label>
        <select
          id="filter-date-from"
          value={filters.dateFrom}
          onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
          disabled={disabled}
          className="text-xs rounded border border-gray-200 bg-white px-2 py-1 text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:opacity-50"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y || 'Any year'}
            </option>
          ))}
        </select>
      </div>

      {/* Date to */}
      <div className="flex items-center gap-1.5">
        <label htmlFor="filter-date-to" className="text-xs text-gray-500 shrink-0">
          To
        </label>
        <select
          id="filter-date-to"
          value={filters.dateTo}
          onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
          disabled={disabled}
          className="text-xs rounded border border-gray-200 bg-white px-2 py-1 text-gray-700 focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-100 disabled:opacity-50"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y || 'Any year'}
            </option>
          ))}
        </select>
      </div>

      {/* Clear */}
      {isActive && (
        <button
          type="button"
          onClick={() => onChange({ category: '', dateFrom: '', dateTo: '' })}
          disabled={disabled}
          className="text-xs text-gray-400 underline underline-offset-2 hover:text-gray-600 disabled:opacity-50"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
