import { motion } from 'framer-motion';
import { Clock3, FileText, Flame, SearchCheck, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import useResumeAnalysis from '../hooks/useResumeAnalysis';
import { GlassCard, SectionHeading } from '../components/ui';

function formatDate(value) {
  return new Date(value).toLocaleString([], {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function HistoryPage() {
  const { history, historyLoading, setCurrentAnalysis } = useResumeAnalysis();
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
    <div className="space-y-6 pb-4">
      <GlassCard className="p-6 sm:p-8">
        <SectionHeading
          eyebrow="Analysis archive"
          title="Stored resume analyses"
          subtitle="Each upload is saved with ATS score, semantic match, matched skills, missing keywords, and recommendations."
        />
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Total entries</p>
            <div className="mt-2 text-3xl font-semibold text-white">{history.length}</div>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-200">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Visible</p>
            <div className="mt-2 text-3xl font-semibold text-white">{filteredHistory.length}</div>
          </div>
        </div>
      </GlassCard>

      <section className="grid gap-4 lg:grid-cols-3">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-teal-200">
            <SearchCheck className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.3em]">ATS ready</p>
          </div>
          <p className="mt-4 text-sm text-slate-300">Semantic matching, skill extraction, and ATS quality checks are tracked for every submission.</p>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-gold-300">
            <Flame className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.3em]">Scoring logic</p>
          </div>
          <p className="mt-4 text-sm text-slate-300">Score blends semantic similarity, keyword coverage, structure, contact info, and resume impact signals.</p>
        </GlassCard>
        <GlassCard className="p-5">
          <div className="flex items-center gap-2 text-sky-200">
            <Clock3 className="h-4 w-4" />
            <p className="text-xs uppercase tracking-[0.3em]">Latest upload</p>
          </div>
          <p className="mt-4 text-sm text-slate-300">The most recent history entries appear first for quick review.</p>
        </GlassCard>
      </section>

      <GlassCard className="p-6">
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-slate-300 focus-within:border-teal-300/40">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            className="w-full bg-transparent text-sm outline-none placeholder:text-slate-500"
            placeholder="Search history by filename or job description"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </label>
      </GlassCard>

      <section className="grid gap-4">
        {historyLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <div className="h-44 animate-pulse rounded-[28px] bg-white/5" />
            <div className="h-44 animate-pulse rounded-[28px] bg-white/5" />
          </div>
        ) : filteredHistory.length ? (
          filteredHistory.map(item => (
            <motion.article
              key={item.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="cursor-pointer rounded-[28px] border border-white/10 bg-slate-950/35 p-6 shadow-[0_20px_80px_rgba(4,8,20,0.3)] backdrop-blur-2xl transition duration-300 hover:-translate-y-0.5 hover:border-white/20 hover:bg-slate-950/50"
              onClick={() => setCurrentAnalysis(item.analysis)}
            >
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-white">
                    <FileText className="h-4 w-4 text-teal-300" />
                    <h3 className="text-lg font-semibold">{item.filename}</h3>
                  </div>
                  <p className="mt-2 text-sm text-slate-300">Uploaded: {formatDate(item.uploaded_at)}</p>
                  {item.job_description ? (
                    <p className="mt-4 max-w-3xl text-sm leading-6 text-slate-300">{item.job_description.slice(0, 260)}{item.job_description.length > 260 ? '...' : ''}</p>
                  ) : null}
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:w-[34rem] lg:grid-cols-4">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">ATS</p>
                    <div className="mt-2 text-3xl font-semibold text-white">{item.analysis?.ats_score || 0}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Semantic</p>
                    <div className="mt-2 text-3xl font-semibold text-white">{item.analysis?.semantic_match_percentage || 0}%</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Skills</p>
                    <div className="mt-2 text-3xl font-semibold text-white">{item.analysis?.matched_skills?.length || 0}</div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center">
                    <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Missing</p>
                    <div className="mt-2 text-3xl font-semibold text-white">{item.analysis?.missing_keywords?.length || 0}</div>
                  </div>
                </div>
              </div>
            </motion.article>
          ))
        ) : (
          <GlassCard className="p-8 text-center text-sm text-slate-400">
            No history is available yet. Run an analysis from the dashboard to populate this page.
          </GlassCard>
        )}
      </section>
    </div>
  );
}
