import { Badge } from '@/components/ui/badge';
import { resolveStaticString } from '@/a2ui/types';

type BadgeVariant = 'default' | 'secondary' | 'destructive' | 'outline';
const validVariants = new Set<BadgeVariant>(['default', 'secondary', 'destructive', 'outline']);

interface BadgeComponentProps {
  label: unknown;
  variant?: unknown;
}

export function BadgeComponent({ label, variant }: BadgeComponentProps) {
  const badgeVariant: BadgeVariant =
    validVariants.has(variant as BadgeVariant) ? (variant as BadgeVariant) : 'default';
  return (
    <Badge variant={badgeVariant} className="text-xs font-medium">
      {resolveStaticString(label)}
    </Badge>
  );
}
