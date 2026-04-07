import { resolveStaticString } from '@/a2ui/types';

interface MetadataCardProps {
  document?: unknown;
  section?: unknown;
  date?: unknown;
  category?: unknown;
}

interface MetaRowProps {
  label: string;
  value: string;
}

function MetaRow({ label, value }: MetaRowProps) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</span>
      <span className="text-xs text-gray-700">{value}</span>
    </div>
  );
}

export function MetadataCard({ document, section, date, category }: MetadataCardProps) {
  const doc = resolveStaticString(document);
  const sec = resolveStaticString(section);
  const dt = resolveStaticString(date);
  const cat = resolveStaticString(category);

  const fields: { label: string; value: string }[] = [
    ...(doc ? [{ label: 'Document', value: doc }] : []),
    ...(sec ? [{ label: 'Section', value: sec }] : []),
    ...(dt ? [{ label: 'Date', value: dt }] : []),
    ...(cat ? [{ label: 'Category', value: cat }] : []),
  ];

  if (fields.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-3">
      {fields.map((f) => (
        <MetaRow key={f.label} label={f.label} value={f.value} />
      ))}
    </div>
  );
}
