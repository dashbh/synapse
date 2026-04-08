import { resolveStaticString } from '@/a2ui/types';

interface MetadataCardProps {
  document?: unknown;
  section?: unknown;
  date?: unknown;
  category?: unknown;
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-[var(--color-neutral-400)]">{label}</span>
      <span className="text-xs text-[var(--color-neutral-700)] leading-snug">{value}</span>
    </div>
  );
}

export function MetadataCard({ document, section, date, category }: MetadataCardProps) {
  const fields = [
    { label: 'Document', value: resolveStaticString(document) },
    { label: 'Section',  value: resolveStaticString(section) },
    { label: 'Date',     value: resolveStaticString(date) },
    { label: 'Category', value: resolveStaticString(category) },
  ].filter((f) => f.value);

  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-6 gap-y-3 rounded-xl border border-[var(--color-primary-50)] bg-[var(--color-primary-50)]/40 px-4 py-3">
      {fields.map((f) => (
        <MetaRow key={f.label} label={f.label} value={f.value} />
      ))}
    </div>
  );
}
