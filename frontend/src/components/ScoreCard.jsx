import { motion } from 'framer-motion';
import { useMemo } from 'react';
import { GlassCard, StatChip } from './ui';

function getScoreTone(scoreValue) {
  if (scoreValue >= 75) return { label: 'Excellent', tone: 'text-emerald-300', ring: 'from-emerald-400 via-teal-300 to-cyan-300' };
  if (scoreValue >= 50) return { label: 'Average', tone: 'text-amber-300', ring: 'from-amber-400 via-gold-300 to-orange-300' };
  return { label: 'Needs work', tone: 'text-rose-300', ring: 'from-rose-400 via-pink-300 to-orange-300' };
}

export default function ScoreCard({ score = 0, label = 'ATS Score', subtitle = 'Calculated from semantic similarity, skill alignment, structure, and impact' }) {
  const clampedScore = Math.max(0, Math.min(score, 100));
  const angle = `${clampedScore * 3.6}deg`;
  const tone = useMemo(() => getScoreTone(clampedScore), [clampedScore]);

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="max-w-sm">
          <p className="text-[11px] uppercase tracking-[0.38em] text-muted">{label}</p>
          <motion.h2
            key={clampedScore}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
            className="mt-2 text-4xl font-semibold tracking-tight text-white"
            aria-live="polite"
          >
            {clampedScore}
          </motion.h2>
          <p className="mt-2 text-sm leading-6 text-muted">{subtitle}</p>
        </div>

        <div className="relative flex h-32 w-32 items-center justify-center">
          <div
            role="img"
            aria-label={`ATS score ${clampedScore} percent`}
            className="relative flex h-32 w-32 items-center justify-center rounded-full glow-border"
            style={{
              background: `conic-gradient(var(--primary-400) 0 ${angle}, rgba(255,255,255,0.06) ${angle} 360deg)`,
              boxShadow: 'inset 0 -6px 20px rgba(2,6,23,0.45)',
            }}
          >
            <div className="flex h-24 w-24 items-center justify-center rounded-full border border-white/6 bg-white/3 text-center soft-card">
              <div>
                <p className={`text-xs uppercase tracking-[0.3em] ${tone.tone}`}>{tone.label}</p>
                <p className="mt-1 text-2xl font-semibold text-white">{clampedScore}%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 h-3 overflow-hidden rounded-full bg-white/6">
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg,var(--primary-400),var(--primary-500))' }}
          initial={{ width: 0 }}
          animate={{ width: `${clampedScore}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <StatChip label="Semantic" value={`${Math.round(clampedScore)}%`} tone={tone.tone} />
        <StatChip label="Quality" value={tone.label} tone={tone.tone} />
        <StatChip label="Performance" value={clampedScore >= 75 ? 'High' : clampedScore >= 50 ? 'Medium' : 'Low'} tone={tone.tone} />
      </div>
    </GlassCard>
  );
}
