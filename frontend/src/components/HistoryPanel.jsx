import { motion } from 'framer-motion';
import { Clock3, ExternalLink, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { GlassCard, SectionHeading } from './ui';

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function HistoryPanel({ history = [], loading = false, onSelect }) {
  const [query, setQuery] = useState('');

  const filteredHistory = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return history;
    return history.filter(item => {
      const filename = (item.filename || '').toLowerCase();
      const job = (item.job_description || '').toLowerCase();
      return filename.includes(normalized) || job.includes(normalized);
    });
  }, [history, query]);

  return (
    <GlassCard className="p-6">
      <SectionHeading
        eyebrow="History"
        title="Recent analyses"
        subtitle="Search by filename or JD content and reopen any previous analysis."
      />

      <label className="mt-5 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-slate-300 focus-within:border-teal-300/40">
        <Search className="h-4 w-4 text-slate-400" />
        <input
          className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
          placeholder="Search history"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </label>

      <div className="mt-5 space-y-3">
        {loading ? (
          <div className="space-y-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : filteredHistory.length ? (
          filteredHistory.slice(0, 4).map((item, index) => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.05 }}
              className="cursor-pointer rounded-2xl border border-white/10 bg-slate-950/40 p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-950/60"
              onClick={() => onSelect?.(item.analysis || null)}
              role="button"
              tabIndex={0}
              onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && onSelect?.(item.analysis || null)}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h4 className="font-medium text-white">{item.filename}</h4>
                  <p className="mt-1 text-sm text-slate-300">{formatDate(item.uploaded_at)}</p>
                </div>
                <div className="rounded-full bg-teal-400/15 px-3 py-1 text-sm font-semibold text-teal-200">
                  {item.analysis?.ats_score || 0}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300">
                <span className="rounded-full border border-white/10 px-2 py-1">{item.analysis?.semantic_match_percentage || 0}% semantic</span>
                <span className="rounded-full border border-white/10 px-2 py-1">{item.analysis?.matched_skills?.length || 0} skills</span>
                <span className="rounded-full border border-white/10 px-2 py-1">{item.analysis?.missing_keywords?.length || 0} missing keywords</span>
              </div>
            </motion.article>
          ))
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/35 p-5 text-sm text-slate-400">
            No saved analyses yet. Upload a resume to create history.
          </div>
        )}
      </div>
      <Link
        to="/history"
        className="mt-5 inline-flex items-center gap-2 text-sm font-medium text-teal-200 transition hover:text-teal-100"
      >
        View all history
        <ExternalLink className="h-4 w-4" />
      </Link>
    </GlassCard>
  );
}
