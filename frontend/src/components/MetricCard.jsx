import { motion } from 'framer-motion';
import { GlassCard } from './ui';

export default function MetricCard({ label, value, helper, accent = 'from-teal-400 via-cyan-300 to-gold-400' }) {
  return (
    <GlassCard className="p-5">
      <div className={`h-1.5 w-16 rounded-full bg-gradient-to-r ${accent}`} />
      <p className="mt-5 text-[11px] uppercase tracking-[0.35em] text-slate-400">{label}</p>
      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-3 text-3xl font-semibold text-white">
        {value}
      </motion.div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{helper}</p>
    </GlassCard>
  );
}
