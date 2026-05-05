import { ChevronDown, Lightbulb } from 'lucide-react';
import { GlassCard, SectionHeading } from './ui';

export default function SuggestionsPanel({ suggestions = [] }) {
  return (
    <GlassCard className="p-6">
      <SectionHeading
        eyebrow="AI recommendations"
        title="Tailored improvement plan"
        subtitle="Open each suggestion to see the exact language the model wants you to strengthen."
      />

      <div className="mt-6 grid gap-3">
        {suggestions.length ? (
          suggestions.map((suggestion, index) => (
            <details
              key={suggestion}
              className="group rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition hover:border-white/20 hover:bg-slate-950/55"
            >
              <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-sm leading-6 text-slate-100">
                <span className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-teal-400/15 text-xs font-semibold text-teal-200">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span>{suggestion}</span>
                </span>
                <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-slate-400 transition group-open:rotate-180 group-open:text-teal-200" />
              </summary>
              <div className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
                Strengthen this area by mirroring the job description language, adding measurable outcomes, and connecting tools to business impact.
              </div>
            </details>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/35 p-6 text-sm text-slate-400">
            Run an analysis to see tailored suggestions.
          </div>
        )}
      </div>
    </GlassCard>
  );
}
