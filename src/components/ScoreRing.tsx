'use client';

import { motion } from 'framer-motion';

interface ScoreRingProps {
  score: number;
  size?: number;
  color?: string;
  showLabel?: boolean;
}

export default function ScoreRing({ score, size = 48, color, showLabel = true }: ScoreRingProps) {
  const radius = (size - 6) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const ringColor =
    color ??
    (score >= 80 ? '#10b981' :
     score >= 60 ? '#6366f1' :
     score >= 40 ? '#f59e0b' : '#64748b');

  return (
    <div className="score-ring-container flex-shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background ring */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={3}
        />
        {/* Progress ring */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={ringColor}
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: circumference - progress }}
          transition={{ duration: 0.8, ease: 'easeOut', delay: 0.1 }}
          style={{ filter: `drop-shadow(0 0 4px ${ringColor}60)` }}
        />
      </svg>
      {showLabel && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="font-bold leading-none"
            style={{ fontSize: size * 0.26, color: ringColor }}
          >
            {score}
          </span>
        </div>
      )}
    </div>
  );
}
