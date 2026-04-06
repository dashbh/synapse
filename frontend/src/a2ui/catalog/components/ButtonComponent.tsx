import { Button } from '@/components/ui/button';
import { resolveStaticString } from '@/a2ui/types';

interface ButtonComponentProps {
  label: unknown;
  variant?: unknown;
  onClick?: () => void;
}

export function ButtonComponent({ label, variant, onClick }: ButtonComponentProps) {
  const buttonVariant = variant === 'secondary' ? 'outline' : 'default';
  return (
    <Button
      variant={buttonVariant}
      onClick={onClick}
      className="font-medium"
    >
      {resolveStaticString(label)}
    </Button>
  );
}
