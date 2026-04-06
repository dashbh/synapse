import { type ReactElement } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { resolveStaticString } from '@/a2ui/types';
import { type RenderChild } from '@/a2ui/catalog/catalogRegistry';

interface CardComponentProps {
  title?: unknown;
  /** IDs of child A2UI components to render inside this card. */
  childIds?: string[];
  renderChild?: RenderChild;
}

export function CardComponent({ title, childIds = [], renderChild }: CardComponentProps) {
  const titleText = resolveStaticString(title);
  const children = renderChild
    ? childIds.map((id) => renderChild(id)).filter((el): el is ReactElement => el !== null)
    : [];

  return (
    <Card className="border border-gray-200 bg-white shadow-sm rounded-xl">
      {titleText && (
        <CardHeader className="pb-2 px-5 pt-4">
          <CardTitle className="text-base font-semibold text-gray-800">
            {titleText}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent className={`px-5 pb-4 flex flex-col gap-3 ${titleText ? '' : 'pt-4'}`}>
        {children.length > 0 ? children : null}
      </CardContent>
    </Card>
  );
}
