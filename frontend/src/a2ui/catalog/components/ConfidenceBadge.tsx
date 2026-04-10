'use client';

/**
 * Displays a citation confidence score in a visually positive way.
 *
 * Color gradient follows confidence: green → lime → yellow → amber
 *   ≥ 87%  →  emerald  "Strong"    ●●●●
 *   ≥ 78%  →  lime     "Good"      ●●●○
 *   ≥ 70%  →  yellow   "Relevant"  ●●○○
 *   < 70%  →  amber    "Partial"   ●○○○
 */

interface Tier {
  label: string;
  dots: number;
  dotColor: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
  ringColor: string;
}

function getTier(score: number): Tier {
  const pct = score * 100;
  if (pct >= 87)
    return {
      label: 'Strong',
      dots: 4,
      dotColor: '#10B981',
      textColor: 'var(--color-success-700)',
      bgColor: 'var(--color-success-50)',
      borderColor: 'var(--color-success-200)',
      ringColor: 'var(--color-success-100)',
    };
  if (pct >= 78)
    return {
      label: 'Good',
      dots: 3,
      dotColor: '#65a30d',
      textColor: '#3f6212',
      bgColor: '#f7fee7',
      borderColor: '#bef264',
      ringColor: '#ecfccb',
    };
  if (pct >= 70)
    return {
      label: 'Relevant',
      dots: 2,
      dotColor: '#ca8a04',
      textColor: '#713f12',
      bgColor: '#fefce8',
      borderColor: '#fde047',
      ringColor: '#fef9c3',
    };
  return {
    label: 'Partial',
    dots: 1,
    dotColor: '#F59E0B',
    textColor: 'var(--color-warning-700)',
    bgColor: 'var(--color-warning-50)',
    borderColor: 'var(--color-warning-200)',
    ringColor: 'var(--color-warning-100)',
  };
}

interface ConfidenceBadgeProps {
  score: number;        // 0–1
  size?: 'sm' | 'md';  // sm = inline pill, md = card badge
}

export function ConfidenceBadge({ score, size = 'sm' }: ConfidenceBadgeProps) {
  const pct = Math.round(score * 100);
  const tier = getTier(score);

  if (size === 'md') {
    return (
      <div
        className="flex flex-col gap-1 rounded-lg px-3 py-2 border"
        style={{
          background: tier.bgColor,
          borderColor: tier.borderColor,
        }}
      >
        {/* Score row */}
        <div className="flex items-center justify-between gap-3">
          <span
            className="text-xs font-bold tabular-nums"
            style={{ color: tier.textColor }}
          >
            {pct}%
          </span>
          <span
            className="text-[10px] font-semibold uppercase tracking-wider"
            style={{ color: tier.textColor }}
          >
            {tier.label}
          </span>
        </div>

        {/* Dot bar */}
        <div className="flex items-center gap-1">
          {[0, 1, 2, 3].map((i) => (
            <span
              key={i}
              className="h-1.5 flex-1 rounded-full transition-all"
              style={{
                background: i < tier.dots ? tier.dotColor : tier.ringColor,
              }}
            />
          ))}
        </div>
      </div>
    );
  }

  // size === 'sm' — compact inline pill
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold"
      style={{
        background: tier.bgColor,
        borderColor: tier.borderColor,
        color: tier.textColor,
      }}
    >
      {/* Mini dots */}
      <span className="flex gap-[2px] items-center">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: i < tier.dots ? tier.dotColor : tier.ringColor }}
          />
        ))}
      </span>
      <span>{tier.label}</span>
      <span className="opacity-70">{pct}%</span>
    </span>
  );
}
