import { motion } from 'framer-motion';

export function GlassCard({ className = '', children, as: Component = 'div', ...props }) {
  return (
    <Component
      className={[
        'card-glass relative overflow-hidden rounded-3xl transition-all duration-300 hover:translate-y-0.5',
        className,
      ].join(' ')}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 opacity-40 bg-[linear-gradient(135deg,rgba(255,255,255,0.04),transparent_28%)]" />
      {children}
    </Component>
  );
}

export function Skeleton({ className = '', style }) {
  return <div className={["skeleton", className].join(' ')} style={style} />;
}

export function SectionHeading({ eyebrow, title, subtitle, align = 'left' }) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      {eyebrow ? <p className="text-xs uppercase tracking-[0.42em] text-muted">{eyebrow}</p> : null}
      <h3 className="mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">{title}</h3>
      {subtitle ? <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">{subtitle}</p> : null}
    </div>
  );
}

export function StatChip({ label, value, tone = 'text-muted' }) {
  return (
    <div className="rounded-2xl border border-white/6 bg-white/3 px-4 py-3 soft-card">
      <p className="text-[11px] uppercase tracking-[0.35em] text-muted">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${tone}`}>{value}</p>
    </div>
  );
}

export function ProgressBar({ value = 0, className = '' }) {
  const clamped = Math.max(0, Math.min(value, 100));
  return (
    <div className={[`h-2 overflow-hidden rounded-full bg-white/6`, className].join(' ')}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: 'linear-gradient(90deg,var(--primary-400),var(--primary-500))' }}
        initial={{ width: 0 }}
        animate={{ width: `${clamped}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}
