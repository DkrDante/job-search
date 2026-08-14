import { JobSource } from '@/lib/types';
import { SOURCE_LABELS, SOURCE_COLORS } from '@/config/defaults';

const SOURCE_EMOJI: Record<string, string> = {
  remotive:    '🟢',
  adzuna:      '🟠',
  'hn-hiring': '🟡',
  remoteok:    '⚪',
  arbeitnow:   '⚫',
  themuse:     '🩷',
  jobicy:      '🔴',
  rss:         '⬜',
  custom:      '⚙️',
};

interface SourceBadgeProps {
  source: JobSource;
}

export default function SourceBadge({ source }: SourceBadgeProps) {
  const label = SOURCE_LABELS[source] ?? source;
  const color = SOURCE_COLORS[source] ?? '#64748b';
  const emoji = SOURCE_EMOJI[source] ?? '•';

  return (
    <span
      className="badge"
      style={{
        background: `${color}18`,
        color,
        border: `1px solid ${color}35`,
        fontSize: 10,
      }}
    >
      {emoji} {label}
    </span>
  );
}
