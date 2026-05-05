import { BadgeCheck, Lightbulb, Sparkles, ShieldCheck } from 'lucide-react';
import { GlassCard, ProgressBar, SectionHeading } from './ui';

function InsightCard({ icon: Icon, label, value, helper, tone }) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-slate-950/35 p-5 transition duration-300 hover:border-white/20 hover:bg-slate-950/55">
      <div className="flex items-center gap-2">
        <Icon className={`h-4 w-4 ${tone}`} />
        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{label}</p>
      </div>
      <div className="mt-3 text-3xl font-semibold text-white">{value}</div>
      <p className="mt-2 text-sm leading-6 text-slate-300">{helper}</p>
    </article>
  );
}

export default function NlpInsightsPanel({ analysis }) {
  const qualityChecks = analysis?.qualityChecks || analysis?.quality_checks || [];
  const actionAnalysis = analysis?.actionVerbAnalysis || analysis?.action_verb_analysis || {};
  const nlpInsights = analysis?.nlpInsights || analysis?.nlp_insights || {};
  const semanticMatch = analysis?.semanticMatch ?? analysis?.semantic_match_percentage ?? 0;
  const technicalMatch = analysis?.technicalMatch ?? analysis?.technical_match_percentage ?? 0;
  const experienceRelevance = analysis?.experienceRelevance ?? analysis?.experience_relevance_percentage ?? 0;
  const educationRelevance = analysis?.educationRelevance ?? analysis?.education_relevance_percentage ?? 0;

  return (
    <GlassCard className="p-6">
      <SectionHeading
        eyebrow="NLP insights"
        title="Semantic match and resume quality"
        subtitle="Sentence-transformer similarity, action verbs, and quality signals drive this panel."
      />

      <div className="mt-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-teal-400/10 via-slate-950/40 to-gold-400/10 p-6">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Semantic Match</p>
            <div className="mt-3 flex items-end gap-3">
              <span className="text-5xl font-semibold text-white">{semanticMatch}%</span>
              <span className="pb-1 text-sm text-slate-300">sentence similarity</span>
            </div>
            <p className="mt-3 max-w-xl text-sm leading-7 text-slate-300">Embedding similarity between the resume and the job description, normalized into a recruiter-friendly ATS signal.</p>
          </div>
          <div className="w-full max-w-md">
            <ProgressBar value={semanticMatch} />
            <div className="mt-3 grid grid-cols-3 gap-3 text-center text-xs uppercase tracking-[0.3em] text-slate-400">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <InsightCard
          icon={Sparkles}
          label="Semantic Match"
          value={`${semanticMatch}%`}
          helper="Cosine similarity over Sentence Transformer embeddings."
          tone="text-teal-300"
        />
        <InsightCard
          icon={BadgeCheck}
          label="Action Verbs"
          value={actionAnalysis.action_verb_count || 0}
          helper={`${(actionAnalysis.unique_action_verbs || []).length} distinct action verbs detected.`}
          tone="text-gold-300"
        />
        <InsightCard
          icon={ShieldCheck}
          label="Quality Score"
          value={`${nlpInsights.quality_score || 0}%`}
          helper="Pass rate across contact info, structure, skills, action verbs, and semantic alignment checks."
          tone="text-sky-300"
        />
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-3">
        <InsightCard
          icon={Sparkles}
          label="Technical Match"
          value={`${technicalMatch}%`}
          helper="Required and preferred JD skills matched in the resume."
          tone="text-teal-300"
        />
        <InsightCard
          icon={BadgeCheck}
          label="Experience Relevance"
          value={`${experienceRelevance}%`}
          helper="Role seniority and experience-context relevance to JD."
          tone="text-gold-300"
        />
        <InsightCard
          icon={ShieldCheck}
          label="Education Relevance"
          value={`${educationRelevance}%`}
          helper="Degree and certification alignment signals."
          tone="text-sky-300"
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-gold-400" />
            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">Quality checks</h4>
          </div>
          <div className="mt-4 space-y-3">
            {qualityChecks.length ? (
              qualityChecks.map(check => (
                <div key={check.name} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-white">{check.name}</p>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${check.passed ? 'bg-teal-400/15 text-teal-200' : 'bg-rose-400/15 text-rose-200'}`}>
                      {check.passed ? 'Pass' : 'Review'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-300">{check.detail}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-slate-400">No quality checks available yet.</p>
            )}
          </div>
        </GlassCard>

        <GlassCard className="p-5">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-teal-300" />
            <h4 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-300">NLP summary</h4>
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Entity count</p>
              <p className="mt-2 text-2xl font-semibold text-white">{nlpInsights.entity_count || 0}</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Section score</p>
              <p className="mt-2 text-2xl font-semibold text-white">{nlpInsights.section_score || 0}%</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Entity labels</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {(nlpInsights.entity_labels || []).length ? (
                  nlpInsights.entity_labels.map(label => (
                    <span key={label} className="rounded-full border border-white/10 bg-slate-950/45 px-3 py-1.5 text-sm text-slate-100">
                      {label}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-slate-400">No entity labels detected yet.</p>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 sm:col-span-2">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Keyword families</p>
              <div className="mt-3 grid gap-2 text-sm text-slate-200 sm:grid-cols-3">
                <span>Soft skills: {(nlpInsights.soft_skills || []).length || 0}</span>
                <span>Education hits: {(nlpInsights.education_keywords || []).length || 0}</span>
                <span>Experience hits: {(nlpInsights.experience_keywords || []).length || 0}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    </GlassCard>
  );
}