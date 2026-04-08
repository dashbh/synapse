import { type ReactElement } from 'react';
import { resolveStaticString } from '@/a2ui/types';
import { type RenderChild } from '@/a2ui/catalog/catalogRegistry';

interface CardComponentProps {
  title?: unknown;
  childIds?: string[];
  renderChild?: RenderChild;
}

export function CardComponent({ title, childIds = [], renderChild }: CardComponentProps) {
  const titleText = resolveStaticString(title);
  const children = renderChild
    ? childIds.map((id) => renderChild(id)).filter((el): el is ReactElement => el !== null)
    : [];

  return (
    <div className="rounded-2xl border border-[var(--color-neutral-100)] bg-white shadow-[var(--shadow-card)] overflow-hidden">
      {titleText && (
        <div className="px-5 pt-4 pb-3 border-b border-[var(--color-neutral-50)]">
          <h3 className="text-sm font-semibold text-[var(--color-neutral-800)]">{titleText}</h3>
        </div>
      )}
      <div className={`px-5 pb-4 flex flex-col gap-3 ${titleText ? 'pt-3' : 'pt-4'}`}>
        {children.length > 0 ? children : null}
      </div>
    </div>
  );
}
